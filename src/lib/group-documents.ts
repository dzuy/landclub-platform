import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database,Queryable} from './database';
import {roleValues,type ClubRole} from './roles';
import {documentTagsSchema,validateDocument,type DocumentActor} from './member-documents';
export const audienceSchema=z.object({everyone:z.boolean(),propertyIds:z.array(z.uuid()).max(100).transform(ids=>[...new Set(ids)]),roles:z.array(z.enum(roleValues)).max(5).transform(roles=>[...new Set(roles)])}).refine(a=>a.everyone?!a.propertyIds.length&&!a.roles.length:!!(a.propertyIds.length||a.roles.length),'Choose a property or club role, or explicitly select everyone.');
export type DocumentAudience=z.infer<typeof audienceSchema>;
export type GroupDocument={id:string;filename:string;byte_size:number;tags:string[];everyone:boolean;property_ids:string[];property_names:string[];roles:ClubRole[];version:number;created_at:string};
export type GroupDocumentActor=DocumentActor & {roles:ClubRole[]};
const fields=`d.id,d.filename,d.byte_size,d.tags,d.everyone,d.property_ids,d.roles,d.version,d.created_at,ARRAY(SELECT p.draft->>'name' FROM properties p WHERE p.id=ANY(d.property_ids) ORDER BY p.draft->>'name') AS property_names`;
const matching=`(d.everyone OR ((cardinality(d.property_ids)=0 OR EXISTS(SELECT 1 FROM member_properties m WHERE m.user_id=$1::uuid AND m.property_id=ANY(d.property_ids))) AND (cardinality(d.roles)=0 OR d.roles && $2::text[])))`;
export class GroupDocumentRepository{
 constructor(private db:Database){}
 private async checkProperties(db:Queryable,ids:string[]){if(ids.length&&(await db.query('SELECT id FROM properties WHERE id=ANY($1::uuid[])',[ids])).rows.length!==ids.length)throw new Error('One of the selected properties no longer exists.');}
 async listAdmin(actor:DocumentActor){if(!actor.admin)throw new Error('Admin access required.');return (await this.db.query<GroupDocument>(`SELECT ${fields} FROM group_documents d ORDER BY d.created_at DESC,d.id`)).rows;}
 async listForMember(actor:GroupDocumentActor){return (await this.db.query<GroupDocument>(`SELECT ${fields} FROM group_documents d WHERE ${matching} ORDER BY d.created_at DESC,d.id`,[z.uuid().safeParse(actor.id).success?actor.id:null,actor.roles])).rows;}
 async download(id:string,actor:GroupDocumentActor){z.uuid().parse(id);return (await this.db.query<GroupDocument & {content:string}>(`SELECT ${fields},d.content FROM group_documents d WHERE ${actor.admin?'d.id=$1::uuid':`${matching} AND d.id=$3::uuid`}`,actor.admin?[id]:[z.uuid().safeParse(actor.id).success?actor.id:null,actor.roles,id])).rows[0]??null;}
 async upload(name:string,bytes:Uint8Array,tags:unknown,audience:unknown,actor:DocumentActor){
  if(!actor.admin)throw new Error('Admin access required.');const filename=validateDocument(name,bytes),parsedTags=documentTagsSchema.parse(tags),a=audienceSchema.parse(audience);
  return this.db.transaction(async tx=>{await this.checkProperties(tx,a.propertyIds);const id=randomUUID();await tx.query('INSERT INTO group_documents(id,filename,byte_size,content,tags,everyone,property_ids,roles,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,filename,bytes.length,Buffer.from(bytes).toString('base64'),parsedTags,a.everyone,a.propertyIds,a.roles,actor.id]);return (await tx.query<GroupDocument>(`SELECT ${fields} FROM group_documents d WHERE id=$1`,[id])).rows[0];});
 }
 async update(id:string,version:number,tags:unknown,audience:unknown,actor:DocumentActor){
  if(!actor.admin)throw new Error('Admin access required.');z.uuid().parse(id);z.number().int().positive().parse(version);const parsedTags=documentTagsSchema.parse(tags),a=audienceSchema.parse(audience);
  return this.db.transaction(async tx=>{await this.checkProperties(tx,a.propertyIds);const result=await tx.query('UPDATE group_documents SET tags=$1,everyone=$2,property_ids=$3,roles=$4,version=version+1 WHERE id=$5 AND version=$6 RETURNING id',[parsedTags,a.everyone,a.propertyIds,a.roles,id,version]);if(!result.rows.length)throw new Error('Document changed. Refresh before editing.');return (await tx.query<GroupDocument>(`SELECT ${fields} FROM group_documents d WHERE id=$1`,[id])).rows[0];});
 }
}
