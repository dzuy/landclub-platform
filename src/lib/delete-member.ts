import {z} from 'zod';
import type {Database} from './database';

// The caller supplies the authenticated actor, never values from a form.
export async function deleteMemberAccount(db:Database,actor:{admin:boolean},userId:string,confirmation:string,deleteAuthUser:()=>Promise<void>){
 if(!actor.admin)throw new Error('Admin access required.');
 z.uuid().parse(userId);
 if(confirmation!=='DELETE')throw new Error('Type DELETE to confirm.');
 await db.transaction(async tx=>{
  // Lock invitation/setup rows against acceptance, resend and cancellation.
  await tx.query('SELECT id FROM invitations WHERE auth_user_id=$1 FOR UPDATE',[userId]);
  const drafts=await tx.query<{id:string}>('SELECT id FROM prepared_members WHERE auth_user_id=$1 FOR UPDATE',[userId]);
  const ids=[userId,...drafts.rows.map(row=>row.id)];
  await tx.query('DELETE FROM member_documents WHERE member_id=ANY($1::uuid[])',[ids]);
  await tx.query('DELETE FROM member_properties WHERE user_id=ANY($1::uuid[])',[ids]);
  await tx.query('DELETE FROM user_roles WHERE user_id=$1',[userId]);
  await tx.query('DELETE FROM prepared_members WHERE auth_user_id=$1',[userId]);
  await tx.query('DELETE FROM invitations WHERE auth_user_id=$1',[userId]);
  // Provider failure rolls back local changes. A retry tolerates an already
  // deleted auth account if the provider succeeded but the DB commit failed.
  await deleteAuthUser();
 });
}
