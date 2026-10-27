import {refreshInvestorDocument} from './automatic-investor-documents';
import {auditActor,auditDocument} from './document-security';
import {validateDocumentContent} from './document-content';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database} from './database';

export const MAX_DOCUMENT_BYTES=20*1024*1024;
export const documentTagsSchema=z.array(z.string().trim().min(1).max(100)).max(30).transform(tags=>[...new Map(tags.map(tag=>[tag.toLowerCase(),tag])).values()]);
export const documentMetadataSchema=z.object({displayName:z.string().trim().max(200),notes:z.string().trim().max(4000),tags:documentTagsSchema});
export type MemberDocument={group?:boolean;property_names?:string[];id:string;member_id:string;filename:string;display_name?:string;notes?:string;byte_size:number;tags:string[];version:number;created_at:string};
export type DocumentActor={id:string;admin:boolean};
const fields='d.id,d.member_id,d.filename,d.display_name,d.notes,d.byte_size,d.tags,d.version,d.created_at';
// Prepared-member files follow only the explicitly linked account, never email or tags.
const owned=`(d.member_id=$1::uuid OR EXISTS(SELECT 1 FROM prepared_members p WHERE p.id=d.member_id AND p.auth_user_id=$1::uuid AND p.status='invited'))`;
export function documentFilename(name:string){return name.split(/[\\/]/).pop()!.replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,200);}
export function validateDocument(name:string,bytes:Uint8Array){
 const filename=documentFilename(name);
 if(!filename||!bytes.length||bytes.length>MAX_DOCUMENT_BYTES)throw new Error('Choose a nonempty file up to 20 MB.');
 const ext=filename.split('.').pop()?.toLowerCase(),buffer=Buffer.from(bytes);
 if(!ext||!['pdf','csv','txt','png','jpg','jpeg'].includes(ext))throw new Error('Use PDF, CSV, TXT, PNG or JPG. Export Office documents to PDF first.');
 if(ext==='pdf'){
  const text=buffer.toString('latin1');
  if(!/^%PDF-(?:1\.[0-7]|2\.0)[\r\n]/.test(text)||!/[\r\n]%%EOF\s*$/.test(text)||! /\b\d+\s+\d+\s+obj\b/.test(text)||! /startxref\s+\d+/.test(text))throw new Error('Invalid or incomplete PDF file.');
  if(/\/(?:JavaScript|JS|Launch|EmbeddedFile|Filespec|RichMedia|XFA|Encrypt)\b/i.test(text))throw new Error('Use an unencrypted PDF without scripts or embedded files.');
 }
 if(ext==='txt'||ext==='csv'){
  let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error('Text files must be valid UTF-8.');}
  if(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text)||/^\s*(?:MZ|<!(?:doctype)|<html|<script)/i.test(text))throw new Error('Invalid plain text file.');
  if(ext==='csv'&&text.split(/\r?\n/).some(line=>line.split(/[,;\t]/).some(cell=>/^\s*"?\s*[=+@-]/.test(cell))))throw new Error('CSV formulas are not accepted. Export a values-only file or PDF.');
 }
 if(ext==='png'&&!buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Invalid PNG file.');
 if((ext==='jpg'||ext==='jpeg')&&!(bytes[0]===255&&bytes[1]===216&&bytes[2]===255))throw new Error('Invalid JPEG file.');
 return filename;
}
export class MemberDocumentRepository{
 constructor(private db:Database){}
 async remove(id:string,version:number,actor:DocumentActor){
  if(!actor.admin)throw new Error('Admin access required.');
  z.uuid().parse(id);z.number().int().positive().parse(version);
  await this.db.transaction(async tx=>{
   await auditActor(tx,actor.id);
   const result=await tx.query('UPDATE member_documents SET deleted_at=now(),version=version+1 WHERE id=$1 AND version=$2 AND deleted_at IS NULL RETURNING id',[id,version]);
   if(!result.rows.length)throw new Error('Document changed or was already deleted. Refresh and try again.');
   await auditDocument(tx,actor.id,'member_documents',id,'delete');
  });
 }

 async updateMetadata(id:string,version:number,input:unknown,actor:DocumentActor){
  if(!actor.admin)throw new Error('Admin access required.');
  z.uuid().parse(id);z.number().int().positive().parse(version);
  const data=documentMetadataSchema.parse(input);
  return this.db.transaction(async tx=>{await auditActor(tx,actor.id);
   const changed=await tx.query('UPDATE member_documents SET display_name=$1,notes=$2,tags=$3,version=version+1 WHERE id=$4 AND version=$5 AND deleted_at IS NULL RETURNING id',[data.displayName,data.notes,data.tags,id,version]);
   if(!changed.rows.length)throw new Error('Document changed. Refresh before editing.');
   return (await tx.query<MemberDocument>(`SELECT ${fields} FROM member_documents d WHERE d.id=$1`,[id])).rows[0];
  });
 }
 async list(memberId:string,actor:DocumentActor){
  if(!actor.admin&&actor.id!==memberId)throw new Error('Access denied.');z.uuid().parse(memberId);
  const before=(await this.db.query<{id:string}>(`SELECT d.id FROM member_documents d WHERE d.deleted_at IS NULL AND ${owned}`,[memberId])).rows;
  const allowed:string[]=[];
  for(const doc of before)if(await refreshInvestorDocument(this.db,doc.id)!=='unavailable')allowed.push(doc.id);
  return (await this.db.query<MemberDocument>(`SELECT ${fields} FROM member_documents d WHERE d.deleted_at IS NULL AND ${owned} AND d.id=ANY($2::uuid[]) ORDER BY d.created_at DESC,d.id`,[memberId,allowed])).rows;
 }
 async download(id:string,actor:DocumentActor){
  z.uuid().parse(id);
  if(!actor.admin&&!z.uuid().safeParse(actor.id).success)return null;
  const predicate=actor.admin?'d.id=$1::uuid':`${owned} AND d.id=$2::uuid`;
  const authorized=(await this.db.query<{id:string}>(`SELECT d.id FROM member_documents d WHERE d.deleted_at IS NULL AND (${predicate})`,actor.admin?[id]:[actor.id,id])).rows.length>0;
  if(!authorized||await refreshInvestorDocument(this.db,id)==='unavailable'){
   await auditDocument(this.db,actor.id,'member_documents',id,'download_denied');return null;
  }
  const doc=(await this.db.query<MemberDocument & {content:string}>(`SELECT ${fields},d.content FROM member_documents d WHERE d.deleted_at IS NULL AND (${predicate})`,actor.admin?[id]:[actor.id,id])).rows[0]??null;
  const allowed=!!doc;
  await auditDocument(this.db,actor.id,'member_documents',id,allowed?'download_authorized':'download_denied');
  return allowed?doc:null;
 }
 async upload(memberId:string,name:string,bytes:Uint8Array,tags:unknown,actor:DocumentActor,metadata:{displayName:string;notes:string}={displayName:'',notes:''}){
  if(!actor.admin)throw new Error('Admin access required.');
  z.uuid().parse(memberId);const filename=validateDocument(name,bytes),parsed=documentTagsSchema.parse(tags),details=documentMetadataSchema.parse({...metadata,tags:parsed});await validateDocumentContent(filename,bytes);
  return (await this.db.query<MemberDocument>(`INSERT INTO member_documents AS d(id,member_id,filename,byte_size,content,tags,uploaded_by,display_name,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${fields}`,[randomUUID(),memberId,filename,bytes.length,Buffer.from(bytes).toString('base64'),parsed,actor.id,details.displayName,details.notes])).rows[0];
 }
 async updateTags(id:string,version:number,tags:unknown,actor:DocumentActor){
  if(!actor.admin)throw new Error('Admin access required.');
  z.uuid().parse(id);z.number().int().positive().parse(version);const parsed=documentTagsSchema.parse(tags);
  return this.db.transaction(async tx=>{await auditActor(tx,actor.id);
  const row=(await tx.query<MemberDocument>(`UPDATE member_documents AS d SET tags=$1,version=version+1 WHERE id=$2 AND version=$3 AND deleted_at IS NULL RETURNING ${fields}`,[parsed,id,version])).rows[0];
  if(!row)throw new Error('This document changed. Refresh before editing its tags.');return row;});
 }
}
