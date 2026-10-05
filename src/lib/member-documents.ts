import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database} from './database';

export const MAX_DOCUMENT_BYTES=20*1024*1024;
export const documentTagsSchema=z.array(z.string().trim().min(1).max(100)).max(30).transform(tags=>[...new Map(tags.map(tag=>[tag.toLowerCase(),tag])).values()]);
export type MemberDocument={group?:boolean;property_names?:string[];id:string;member_id:string;filename:string;byte_size:number;tags:string[];version:number;created_at:string};
export type DocumentActor={id:string;admin:boolean};
const fields='d.id,d.member_id,d.filename,d.byte_size,d.tags,d.version,d.created_at';
// Prepared-member files follow only the explicitly linked account, never email or tags.
const owned=`(d.member_id=$1::uuid OR EXISTS(SELECT 1 FROM prepared_members p WHERE p.id=d.member_id AND p.auth_user_id=$1::uuid AND p.status='invited'))`;
export function documentFilename(name:string){return name.split(/[\\/]/).pop()!.replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,200);}
export function validateDocument(name:string,bytes:Uint8Array){
 const filename=documentFilename(name);
 if(!filename||!bytes.length||bytes.length>MAX_DOCUMENT_BYTES)throw new Error('Choose a nonempty file up to 20 MB.');
 const ext=filename.split('.').pop()?.toLowerCase();
 if(!ext||!['pdf','docx','xlsx','csv','txt','png','jpg','jpeg'].includes(ext))throw new Error('Use PDF, DOCX, XLSX, CSV, TXT, PNG or JPG.');
 if(ext==='pdf'&&Buffer.from(bytes.subarray(0,5)).toString()!=='%PDF-')throw new Error('Invalid PDF file.');
 if(['docx','xlsx'].includes(ext)&&!(bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4))throw new Error('Invalid Office file.');
 return filename;
}
export class MemberDocumentRepository{
 constructor(private db:Database){}
 async list(memberId:string,actor:DocumentActor){if(!actor.admin&&actor.id!==memberId)throw new Error('Access denied.');z.uuid().parse(memberId);return (await this.db.query<MemberDocument>(`SELECT ${fields} FROM member_documents d WHERE ${owned} ORDER BY d.created_at DESC,d.id`,[memberId])).rows;}
 async download(id:string,actor:DocumentActor){
  z.uuid().parse(id);
  if(!actor.admin&&!z.uuid().safeParse(actor.id).success)return null;
  const predicate=actor.admin?'d.id=$1::uuid':`${owned} AND d.id=$2::uuid`;
  return (await this.db.query<MemberDocument & {content:string}>(`SELECT ${fields},d.content FROM member_documents d WHERE ${predicate}`,actor.admin?[id]:[actor.id,id])).rows[0]??null;
 }
 async upload(memberId:string,name:string,bytes:Uint8Array,tags:unknown,actor:DocumentActor){
  if(!actor.admin)throw new Error('Admin access required.');
  z.uuid().parse(memberId);const filename=validateDocument(name,bytes),parsed=documentTagsSchema.parse(tags);
  return (await this.db.query<MemberDocument>(`INSERT INTO member_documents AS d(id,member_id,filename,byte_size,content,tags,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING ${fields}`,[randomUUID(),memberId,filename,bytes.length,Buffer.from(bytes).toString('base64'),parsed,actor.id])).rows[0];
 }
 async updateTags(id:string,version:number,tags:unknown,actor:DocumentActor){
  if(!actor.admin)throw new Error('Admin access required.');
  z.uuid().parse(id);z.number().int().positive().parse(version);const parsed=documentTagsSchema.parse(tags);
  const row=(await this.db.query<MemberDocument>(`UPDATE member_documents AS d SET tags=$1,version=version+1 WHERE id=$2 AND version=$3 RETURNING ${fields}`,[parsed,id,version])).rows[0];
  if(!row)throw new Error('This document changed. Refresh before editing its tags.');return row;
 }
}
