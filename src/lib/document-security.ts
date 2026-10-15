import {createHash} from 'node:crypto';
import type {Queryable} from './database';
export type ScanStatus='quarantined'|'clean'|'blocked';
export const documentDigest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export async function auditDocument(db:Queryable,actor:string,kind:string,id:string,event:string){await db.query('INSERT INTO document_audit_events(actor,resource_type,resource_id,event) VALUES($1,$2,$3,$4)',[actor,kind,id,event]);}
export async function auditActor(db:Queryable,actor:string){await db.query("SELECT set_config('land_club.audit_actor',$1,true)",[actor]);}
export function cleanDocument(doc:{content:string;scan_status:ScanStatus;scanned_sha256:string|null;scanned_at:unknown}){return doc.scan_status==='clean'&&!!doc.scanned_at&&doc.scanned_sha256===documentDigest(Buffer.from(doc.content,'base64'));}
