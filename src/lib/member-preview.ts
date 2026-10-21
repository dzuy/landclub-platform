import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database} from './database';
import {previewMemberIdentity} from './dashboard-preview-identity';
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
type Actor={id:string;admin:boolean};
function staff(actor:Actor){if(!actor.admin)throw new Error('Admin access required.');}
// Member-only sessions use the existing audit ledger; no financial person or grant is created.
// For these two action names, person_id identifies the prepared member, not report_people.
export class MemberPreviewRepository{
 constructor(private db:Database){}
 async options(actor:Actor){
  staff(actor);
  return (await this.db.query<{id:string;display_name:string}>(`SELECT 'member:'||m.id AS id,COALESCE(NULLIF(m.info->>'displayName',''),m.email) AS display_name
   FROM prepared_members m WHERE m.status='invited' AND m.auth_user_id IS NOT NULL
   AND EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=m.auth_user_id)
   AND NOT EXISTS(SELECT 1 FROM report_people p WHERE p.prepared_member_id=m.id OR p.auth_user_id=m.auth_user_id)
   ORDER BY display_name`)).rows;
 }
 async identity(id:string){
  if(!z.uuid().safeParse(id).success)return null;
  const member=(await this.db.query<{id:string;auth_user_id:string;name:string}>(`SELECT id,auth_user_id,COALESCE(NULLIF(info->>'displayName',''),email) AS name FROM prepared_members WHERE id=$1 AND status='invited' AND auth_user_id IS NOT NULL`,[id])).rows[0];
  if(!member)return null;
  const person={id:'00000000-0000-0000-0000-000000000000',source_id:'',display_name:member.name,auth_user_id:member.auth_user_id,prepared_member_id:member.id,disabled_at:null};
  const identity=await previewMemberIdentity(this.db,person);
  return identity?{...identity,person,mode:'investor' as const,memberTargetId:id}:null;
 }
 async begin(id:string,actor:Actor){
  staff(actor);if(!await this.identity(id))throw new Error('Member unavailable.');
  const token='member:'+randomBytes(32).toString('hex');
  await this.db.query("INSERT INTO investor_operations_audit(id,actor_id,person_id,action,resource_id) VALUES($1,$2,$3,'preview.member.start',$4)",[randomUUID(),actor.id,id,hash(token)]);
  return token;
 }
 async preview(token:string,actor:Actor){
  if(!actor.admin||!/^member:[a-f0-9]{64}$/.test(token))return null;
  const row=(await this.db.query<{person_id:string}>(`SELECT s.person_id FROM investor_operations_audit s WHERE s.action='preview.member.start' AND s.resource_id=$1 AND s.actor_id=$2 AND s.created_at>now()-interval '30 minutes'
   AND NOT EXISTS(SELECT 1 FROM investor_operations_audit e WHERE e.action='preview.member.exit' AND e.resource_id=s.resource_id AND e.actor_id=s.actor_id)`,[hash(token),actor.id])).rows[0];
  return row?this.identity(row.person_id):null;
 }
 async end(token:string,actor:Actor){
  staff(actor);
  await this.db.query("INSERT INTO investor_operations_audit(id,actor_id,action,resource_id) VALUES($1,$2,'preview.member.exit',$3)",[randomUUID(),actor.id,hash(token)]);
 }
}
