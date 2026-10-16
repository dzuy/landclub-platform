import type {Queryable} from './database';
export async function auditDocument(db:Queryable,actor:string,kind:string,id:string,event:string){await db.query('INSERT INTO document_audit_events(actor,resource_type,resource_id,event) VALUES($1,$2,$3,$4)',[actor,kind,id,event]);}
export async function auditActor(db:Queryable,actor:string){await db.query("SELECT set_config('land_club.audit_actor',$1,true)",[actor]);}
