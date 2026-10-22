import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database} from './database';
import {InvitationRepository} from './invitations';
import {roleSchema} from './roles';
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
type Actor={id:string;admin:boolean};
function staff(actor:Actor){if(!actor.admin)throw new Error('Admin access required.');}
// Member-only sessions use the existing audit ledger; no financial person or grant is created.
// For these action names, person_id is the selected profile/account ID, not report_people.
export class MemberPreviewRepository{
 constructor(private db:Database){}
 async options(actor:Actor){
  staff(actor);
  return (await this.db.query<{id:string;display_name:string}>(`SELECT 'member:'||m.id AS id,COALESCE(NULLIF(m.info->>'displayName',''),m.email) AS display_name
   FROM prepared_members m
   WHERE NOT EXISTS(SELECT 1 FROM report_people p WHERE p.disabled_at IS NULL AND (p.prepared_member_id=m.id OR p.auth_user_id=m.auth_user_id))
   UNION ALL
   SELECT 'member:'||u.id,COALESCE(NULLIF(u.raw_user_meta_data->>'display_name',''),NULLIF(u.raw_user_meta_data->>'full_name',''),u.email,'Account '||u.id)
   FROM auth.users u
   WHERE NOT EXISTS(SELECT 1 FROM prepared_members m WHERE m.auth_user_id=u.id)
   AND NOT EXISTS(SELECT 1 FROM report_people p WHERE p.disabled_at IS NULL AND p.auth_user_id=u.id)
   ORDER BY display_name`)).rows;
 }
 async identity(id:string){
  if(!z.uuid().safeParse(id).success)return null;
  const member=(await this.db.query<{id:string;auth_user_id:string|null;email:string;roles:string[];info:{displayName?:string;homeRegion?:string;contactPhone?:string}}>('SELECT id,auth_user_id,email,roles,info FROM prepared_members WHERE id=$1',[id])).rows[0];
  const accountId=member?.auth_user_id||(!member?id:null);
  // Only profile fields are read from Auth. Metadata never supplies authorization roles.
  const account=accountId?(await this.db.query<{id:string;email:string|null;display_name:string|null;home_region:string|null;contact_phone:string|null;confirmed:boolean;anonymous:boolean;banned:boolean}>(`SELECT id,email,COALESCE(raw_user_meta_data->>'display_name',raw_user_meta_data->>'full_name') AS display_name,
   raw_user_meta_data->>'home_region' AS home_region,raw_user_meta_data->>'contact_phone' AS contact_phone,
   email_confirmed_at IS NOT NULL AS confirmed,is_anonymous AS anonymous,banned_until>now() AS banned
   FROM auth.users WHERE id=$1`,[accountId])).rows[0]:null;
  if(!member&&!account)return null;
  const memberId=account?.id||member!.id;
  const assigned=account?await new InvitationRepository(this.db).rolesForUser(account.id):[];
  // Prepared role labels are setup information, not active account permissions.
  const eligible=account?.confirmed&&!account.anonymous&&!account.banned;
  const roles=eligible?assigned.flatMap(role=>{const parsed=roleSchema.safeParse(role);return parsed.success&&parsed.data!=='admin'?[parsed.data]:[];}):[];
  const profile=account?{displayName:account.display_name||member?.info.displayName||'',homeRegion:account.home_region||'',contactPhone:account.contact_phone||''}:member!.info;
  const name=profile.displayName||account?.email||member?.email||'Account';
  const notice=!account?'Prepared profile · no login account':!eligible?'Account cannot currently sign in':!assigned.length?'Account has no assigned club roles':'Member account preview';
  const person={id:'00000000-0000-0000-0000-000000000000',source_id:'',display_name:name,auth_user_id:account?.id||null,prepared_member_id:member?.id||null,disabled_at:null};
  return {memberId,roles,profile,person,mode:'investor' as const,memberTargetId:id,notice};
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
