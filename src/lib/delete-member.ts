import {auditActor} from './document-security';
import {z} from 'zod';
import type {Database,Queryable} from './database';

// The caller supplies the authenticated actor, never values from a form.
export async function deleteMemberAccount(db:Database,actor:{admin:boolean;id?:string},userId:string,confirmation:string,deleteAuthUser:()=>Promise<void>){
 if(!actor.admin)throw new Error('Admin access required.');
 z.uuid().parse(userId);
 if(confirmation!=='DELETE')throw new Error('Type DELETE to confirm.');
 await db.transaction(async tx=>{
  await auditActor(tx,actor.id||'admin:unattributed');
  await removeAccountData(tx,userId);
  // Provider failure rolls back local changes. A retry tolerates an already
  // deleted auth account if the provider succeeded but the DB commit failed.
  await deleteAuthUser();
 });
}

async function removeAccountData(tx:Queryable,userId:string){
  // Lock invitation/setup rows against acceptance, resend and cancellation.
  await tx.query('SELECT id FROM invitations WHERE auth_user_id=$1 FOR UPDATE',[userId]);
  const drafts=await tx.query<{id:string}>('SELECT id FROM prepared_members WHERE auth_user_id=$1 FOR UPDATE',[userId]);
  const ids=[userId,...drafts.rows.map(row=>row.id)];
  await tx.query('DELETE FROM member_documents WHERE member_id=ANY($1::uuid[])',[ids]);
  await tx.query('DELETE FROM member_properties WHERE user_id=ANY($1::uuid[])',[ids]);
  await tx.query('DELETE FROM member_investments WHERE user_id=ANY($1::uuid[])',[ids]);
  if((await tx.query<{name:string|null}>("SELECT to_regclass('property_follows')::text AS name")).rows[0]?.name)await tx.query('DELETE FROM property_follows WHERE user_id=ANY($1::text[])',[ids]);
  await tx.query('DELETE FROM user_roles WHERE user_id=$1',[userId]);
  await tx.query('DELETE FROM prepared_members WHERE auth_user_id=$1',[userId]);
  await tx.query('DELETE FROM invitations WHERE auth_user_id=$1',[userId]);
}

// Draft and invitation IDs are resolved on the server; they are not auth user IDs.
export async function deleteUnacceptedMember(db:Database,actor:{admin:boolean;id?:string},kind:'prepared'|'invitation',id:string,confirmation:string,deleteAuthUser:(userId:string)=>Promise<void>){
 if(!actor.admin)throw new Error('Admin access required.');
 z.uuid().parse(id);
 if(confirmation!=='DELETE')throw new Error('Type DELETE to confirm.');
 await db.transaction(async tx=>{
  await auditActor(tx,actor.id||'admin:unattributed');
  const table=kind==='prepared'?'prepared_members':'invitations';
  const row=(await tx.query<{status:string;auth_user_id:string|null}>(`SELECT status,auth_user_id FROM ${table} WHERE id=$1 FOR UPDATE`,[id])).rows[0];
  if(!row)return;
  if(row.status==='sending')throw new Error('Check invitation status before deleting this member. Delivery is still being confirmed.');
  if(row.auth_user_id){
   await removeAccountData(tx,row.auth_user_id);
   await deleteAuthUser(row.auth_user_id);
  }else{
   if(kind==='prepared'){
    await tx.query('DELETE FROM member_documents WHERE member_id=$1',[id]);
    await tx.query('DELETE FROM member_properties WHERE user_id=$1',[id]);
    await tx.query('DELETE FROM member_investments WHERE user_id=$1',[id]);
   }
   await tx.query(`DELETE FROM ${table} WHERE id=$1`,[id]);
  }
 });
}
