import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database,Queryable} from './database';
export type SharingActor={id:string;email:string;verified:boolean};
export type SharingMail={invitationId:string;email:string;token:string;accounts:string[]};
export type SharingInvitation={id:string;email:string;status:string;delivery_state:string;expires_at:string;accounts:string[]};
const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
function valid(actor:SharingActor){if(!actor.verified||!z.uuid().safeParse(actor.id).success||!z.email().safeParse(actor.email).success)throw new Error('Sign in with a verified account.');}
// Only explicit source ownership establishes authority. Generic access rows,
// member roles and delegated invitation scopes never establish ownership.
export function sourceOwnershipPredicate(person:string,position:string){return `EXISTS (
 SELECT 1 FROM investment_position_terms terms
 JOIN investment_holders holder ON holder.id=${position}.holder_id
 JOIN investor_source_snapshots original ON original.id=terms.snapshot_id
 JOIN LATERAL (SELECT snapshot.payload FROM investor_source_snapshots snapshot
   JOIN investor_import_batches batch ON batch.digest=snapshot.sha256 AND batch.source_key=snapshot.source_key
   WHERE snapshot.source_key=original.source_key ORDER BY snapshot.captured_at DESC,snapshot.id DESC LIMIT 1) latest ON TRUE
 CROSS JOIN LATERAL jsonb_array_elements(latest.payload) book
 CROSS JOIN LATERAL jsonb_array_elements(book->'tabs') sheet
 CROSS JOIN LATERAL jsonb_array_elements(sheet->'rows') relationship
 WHERE terms.position_id=${position}.id
 AND terms.source_fields->>'position_id'=${position}.source_id
 AND terms.source_fields->>'investor_id'=holder.source_id
 AND sheet->>'name'='investor_access'
 AND relationship->>'person_id'=${person}.source_id
 AND relationship->>'investor_id'=holder.source_id
 GROUP BY terms.position_id
 HAVING bool_and(COALESCE(relationship->>'access_role','')='owner'))`;}
const ownerAccess=`JOIN investor_access a ON a.holder_id=p.holder_id AND a.revoked_at IS NULL
 JOIN report_people owner ON owner.id=a.person_id AND owner.disabled_at IS NULL AND ${sourceOwnershipPredicate('owner','p')}`;
// Deliberately separate from investor_access: accepting never creates owner authority,
// club roles, property membership, or access to the inviter's personal documents.
export const sharedReportPredicate=`($1::boolean IS NOT NULL AND r.released_at IS NOT NULL AND r.review_state='reviewed' AND EXISTS (
 SELECT 1 FROM investment_sharing_scope scope
 JOIN investment_sharing_invitations invitation ON invitation.id=scope.invitation_id
 JOIN report_people recipient ON recipient.id=invitation.recipient_person_id
 JOIN report_people owner ON owner.id=invitation.owner_person_id AND owner.disabled_at IS NULL
 JOIN investor_access source_access ON source_access.person_id=owner.id AND source_access.holder_id=p.holder_id AND source_access.revoked_at IS NULL
 WHERE scope.position_id=p.id AND ${sourceOwnershipPredicate('owner','p')} AND invitation.status='accepted' AND recipient.disabled_at IS NULL AND recipient.auth_user_id=$2::uuid))`;
async function audit(tx:Queryable,actor:SharingActor,action:string,id:string,person:string|null=null){await tx.query('INSERT INTO investor_operations_audit(id,actor_id,action,resource_id,person_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),actor.id,`sharing_${action}`,id,person]);}
export class InvestmentSharingRepository{
 constructor(private db:Database){}
 async ready(){return (await this.db.query<{ready:boolean}>("SELECT to_regclass('investment_sharing_invitations') IS NOT NULL AS ready")).rows[0]?.ready===true;}
 async owned(actor:SharingActor){valid(actor);return (await this.db.query<{id:string;name:string;holder_name:string}>(`SELECT p.id,p.project_name||' · '||p.kind AS name,h.name AS holder_name FROM investment_positions p JOIN investment_holders h ON h.id=p.holder_id ${ownerAccess} WHERE owner.auth_user_id=$1 ORDER BY h.name,p.project_name,p.name`,[actor.id])).rows;}
 async list(actor:SharingActor){valid(actor);return (await this.db.query<SharingInvitation>(`SELECT i.id,i.email,CASE WHEN i.status='pending' AND i.expires_at<=now() THEN 'expired' ELSE i.status END AS status,i.delivery_state,i.expires_at::text,array_agg(p.project_name||' · '||p.kind ORDER BY p.name) AS accounts FROM investment_sharing_invitations i JOIN report_people owner ON owner.id=i.owner_person_id JOIN investment_sharing_scope s ON s.invitation_id=i.id JOIN investment_positions p ON p.id=s.position_id WHERE owner.auth_user_id=$1 AND owner.disabled_at IS NULL GROUP BY i.id ORDER BY i.created_at DESC`,[actor.id])).rows;}
 // Read-only audited preview. The actual admin and token remain the authority;
 // the selected person never becomes an authenticated SharingActor.
 async preview(token:string,actor:{id:string;admin:boolean}){
  if(!actor.admin||!z.uuid().safeParse(actor.id).success||!/^[a-f0-9]{64}$/.test(token))return null;
  return this.db.transaction(async tx=>{
   const session=`SELECT person.id,person.auth_user_id FROM investor_preview_sessions session JOIN report_people person ON person.id=session.person_id WHERE session.token_hash=$1 AND session.admin_id=$2 AND session.ended_at IS NULL AND session.expires_at>now() AND person.disabled_at IS NULL`;
   const args=[tokenHash(token),actor.id],person=(await tx.query<{id:string;auth_user_id:string|null}>(session,args)).rows[0];if(!person)return null;
   const owned=(await tx.query<{id:string;name:string;holder_name:string}>(`SELECT p.id,p.project_name||' · '||p.kind AS name,h.name AS holder_name FROM investment_positions p JOIN investment_holders h ON h.id=p.holder_id ${ownerAccess} WHERE owner.id=$1 ORDER BY h.name,p.project_name,p.name`,[person.id])).rows;
   const invitations=(await tx.query<SharingInvitation>(`SELECT i.id,i.email,CASE WHEN i.status='pending' AND i.expires_at<=now() THEN 'expired' ELSE i.status END AS status,i.delivery_state,i.expires_at::text,array_agg(p.project_name||' · '||p.kind ORDER BY p.name) AS accounts FROM investment_sharing_invitations i JOIN investment_sharing_scope s ON s.invitation_id=i.id JOIN investment_positions p ON p.id=s.position_id WHERE i.owner_person_id=$1 GROUP BY i.id ORDER BY i.created_at DESC`,[person.id])).rows;
   const reports=(await tx.query<{id:string;title:string;project_name:string;kind:string;holder_name:string}>(`SELECT r.id,r.title,p.project_name,p.kind,h.name AS holder_name FROM investor_reports r JOIN investment_positions p ON p.id=r.position_id JOIN investment_holders h ON h.id=p.holder_id WHERE ${sharedReportPredicate.replace('recipient.auth_user_id=$2::uuid','recipient.id=$2::uuid')} ORDER BY r.created_at DESC`,[false,person.id])).rows;
   if(!(await tx.query(session,args)).rows.length)return null;
   return {personId:person.id,owned,invitations,reports,linkedAccount:!!person.auth_user_id};
  });
 }
 async invite(actor:SharingActor,email:string,positions:string[],deliver:(mail:SharingMail)=>Promise<void>){return this.inviteScoped(actor,email,positions,deliver);}
 async inviteOnBehalf(actor:SharingActor & {admin:boolean},token:string,expectedPerson:string,email:string,positions:string[],deliver:(mail:SharingMail)=>Promise<void>){
  if(!actor.admin)throw new Error('Administrator authority is required.');
  return this.inviteScoped(actor,email,positions,deliver,{token,expectedPerson,admin:actor.admin});
 }
 private async previewPerson(tx:Queryable,actor:SharingActor,scope:{token:string;expectedPerson:string;admin:boolean}){
  if(!scope.admin||!/^[a-f0-9]{64}$/.test(scope.token))throw new Error('Preview unavailable.');
  const person=(await tx.query<{id:string}>(`SELECT person.id FROM investor_preview_sessions session JOIN report_people person ON person.id=session.person_id WHERE session.token_hash=$1 AND session.admin_id=$2 AND session.ended_at IS NULL AND session.expires_at>now() AND person.disabled_at IS NULL FOR UPDATE OF session,person`,[tokenHash(scope.token),actor.id])).rows[0];
  if(!person||person.id!==scope.expectedPerson)throw new Error('Preview unavailable.');return person;
 }
 private async inviteScoped(actor:SharingActor,email:string,positions:string[],deliver:(mail:SharingMail)=>Promise<void>,scope?:{token:string;expectedPerson:string;admin:boolean}){
  valid(actor);email=email.trim().toLowerCase();
  if(!z.email().max(254).safeParse(email).success||email===actor.email.toLowerCase())throw new Error('Enter another person’s valid email address.');
  if(!positions.length||positions.length>50||new Set(positions).size!==positions.length||positions.some(id=>!z.uuid().safeParse(id).success))throw new Error('Select between 1 and 50 investment accounts.');
  const id=randomUUID(),token=randomBytes(32).toString('base64url');let targetPerson:string|null=null;
  const accounts=await this.db.transaction(async tx=>{
   const owner=scope?await this.previewPerson(tx,actor,scope):(await tx.query<{id:string}>('SELECT id FROM report_people WHERE auth_user_id=$1 AND disabled_at IS NULL FOR UPDATE',[actor.id])).rows[0];
   if(!owner)throw new Error('Owner authority is required.');targetPerson=scope?owner.id:null;
   const selected=(await tx.query<{id:string;name:string}>(`SELECT p.id,p.project_name||' · '||p.kind AS name FROM investment_positions p ${ownerAccess} WHERE owner.id=$1 AND p.id=ANY($2::uuid[])`,[owner.id,positions])).rows;
   if(selected.length!==positions.length)throw new Error('Owner authority is required for every selected account.');
   if((await tx.query(`SELECT i.id FROM investment_sharing_invitations i JOIN investment_sharing_scope s ON s.invitation_id=i.id WHERE i.owner_person_id=$1 AND i.email=$2 AND (i.status IN ('accepted','failed') OR (i.status='pending' AND i.expires_at>now())) AND s.position_id=ANY($3::uuid[])`,[owner.id,email,positions])).rows.length)throw new Error('This person already has an active, pending or delivery-failed invitation for a selected investment. Revoke it before sending another.');
   await tx.query("INSERT INTO investment_sharing_invitations(id,owner_person_id,email,token_hash,status,expires_at) VALUES($1,$2,$3,$4,'pending',now()+interval '7 days')",[id,owner.id,email,tokenHash(token)]);
   for(const position of positions)await tx.query('INSERT INTO investment_sharing_scope(invitation_id,position_id) VALUES($1,$2)',[id,position]);
   await audit(tx,actor,scope?'invited_on_behalf':'invited',id,targetPerson);return selected.map(p=>p.name);
  });
  try{await deliver({invitationId:id,email,token,accounts});await this.db.query("UPDATE investment_sharing_invitations SET delivery_state='sent' WHERE id=$1",[id]);}
  catch{await this.db.transaction(async tx=>{await tx.query("UPDATE investment_sharing_invitations SET status='failed',delivery_state='failed' WHERE id=$1 AND status='pending'",[id]);await audit(tx,actor,scope?'delivery_failed_on_behalf':'delivery_failed',id,targetPerson);});throw new Error('Invitation delivery could not be confirmed. Revoke it before trying again if it is still pending.');}
  return id;
 }
 async pending(actor:SharingActor,token:string){valid(actor);if(!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
  return (await this.db.query<{id:string;accounts:string[]}>(`SELECT i.id,array_agg(p.project_name||' · '||p.kind ORDER BY p.name) AS accounts FROM investment_sharing_invitations i JOIN investment_sharing_scope s ON s.invitation_id=i.id JOIN investment_positions p ON p.id=s.position_id ${ownerAccess} WHERE i.token_hash=$1 AND i.email=$2 AND i.status='pending' AND i.expires_at>now() AND owner.id=i.owner_person_id AND NOT EXISTS (SELECT 1 FROM report_people blocked WHERE blocked.auth_user_id=$3::uuid AND blocked.disabled_at IS NOT NULL) GROUP BY i.id HAVING count(*)=(SELECT count(*) FROM investment_sharing_scope all_scope WHERE all_scope.invitation_id=i.id)`,[tokenHash(token),actor.email.toLowerCase(),actor.id])).rows[0]??null;
 }
 async accept(actor:SharingActor,token:string){valid(actor);if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new Error('Invitation unavailable.');
  return this.db.transaction(async tx=>{
   const i=(await tx.query<{id:string;owner_person_id:string}>("SELECT id,owner_person_id FROM investment_sharing_invitations WHERE token_hash=$1 AND email=$2 AND status='pending' AND expires_at>now() FOR UPDATE",[tokenHash(token),actor.email.toLowerCase()])).rows[0];
   if(!i)throw new Error('Invitation unavailable.');
   const scope=(await tx.query<{id:string}>(`SELECT p.id FROM investment_sharing_scope s JOIN investment_positions p ON p.id=s.position_id ${ownerAccess} WHERE s.invitation_id=$1 AND owner.id=$2`,[i.id,i.owner_person_id])).rows;
   const count=(await tx.query<{n:number}>('SELECT count(*)::integer AS n FROM investment_sharing_scope WHERE invitation_id=$1',[i.id])).rows[0].n;
   if(!count||scope.length!==count)throw new Error('Invitation unavailable.');
   await tx.query('INSERT INTO report_people(id,auth_user_id) VALUES($1,$2) ON CONFLICT(auth_user_id) DO NOTHING',[randomUUID(),actor.id]);
   const person=(await tx.query<{id:string;disabled_at:string|null}>('SELECT id,disabled_at FROM report_people WHERE auth_user_id=$1 FOR UPDATE',[actor.id])).rows[0];
   if(person.disabled_at||person.id===i.owner_person_id)throw new Error('Invitation unavailable.');
   await tx.query("UPDATE investment_sharing_invitations SET status='accepted',recipient_person_id=$2,accepted_at=now() WHERE id=$1",[i.id,person.id]);
   await audit(tx,actor,'accepted',i.id);
  });
 }
 async revoke(actor:SharingActor,id:string){return this.revokeScoped(actor,id);}
 async revokeOnBehalf(actor:SharingActor & {admin:boolean},token:string,expectedPerson:string,id:string){if(!actor.admin)throw new Error('Administrator authority is required.');return this.revokeScoped(actor,id,{token,expectedPerson,admin:actor.admin});}
 private async revokeScoped(actor:SharingActor,id:string,scope?:{token:string;expectedPerson:string;admin:boolean}){valid(actor);if(!z.uuid().safeParse(id).success)throw new Error('Invitation unavailable.');return this.db.transaction(async tx=>{
  const target=scope?await this.previewPerson(tx,actor,scope):null;
  const result=await tx.query(`UPDATE investment_sharing_invitations i SET status='revoked',revoked_at=now() FROM report_people owner WHERE i.id=$1 AND owner.id=i.owner_person_id AND ${scope?'owner.id':'owner.auth_user_id'}=$2 AND owner.disabled_at IS NULL AND i.status IN ('pending','accepted','failed') RETURNING i.id`,[id,target?.id??actor.id]);
  if(!result.rows.length)throw new Error('Invitation unavailable.');await audit(tx,actor,scope?'revoked_on_behalf':'revoked',id,target?.id??null);
 });}
}
