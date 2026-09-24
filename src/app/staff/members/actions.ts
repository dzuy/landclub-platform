'use server';
import {randomUUID} from 'node:crypto';
import {headers} from 'next/headers';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {requireStaff} from '@/lib/staff';
import {database} from '@/lib/database';
import {InvitationRepository} from '@/lib/invitations';
import {readRoles} from '@/lib/roles';
import {authAdminClient} from '@/lib/auth/admin';
import {canonicalSiteUrl} from '@/lib/auth/recovery';

export type InvitationState={error:string;message?:string};
export type RoleUpdateState={error:string;message?:string};
const emailSchema=z.email().max(254);
const roleTargetSchema=z.object({kind:z.enum(['user','invitation']),id:z.uuid()});
export async function sendInvitation(_previous:InvitationState,form:FormData):Promise<InvitationState>{
 const actor=await requireStaff();
 const emailResult=emailSchema.safeParse(form.get('email'));
 if(!emailResult.success)return {error:'Enter a valid email address.'};
 const email=emailResult.data.trim().toLowerCase(),roles=readRoles(form.getAll('roles'));
 const repository=new InvitationRepository(database());await repository.initialize();
 const id=randomUUID();
 try{await repository.begin(id,email,roles,actor.id);}catch{return {error:'This email already has an active invitation.'};}
 try{
  const siteUrl=canonicalSiteUrl((await headers()).get('origin'),process.env.LAND_CLUB_SITE_URL,process.env.NODE_ENV);
  const redirectTo=new URL('/auth/confirm',siteUrl).toString();
  const {data,error}=await authAdminClient().auth.admin.inviteUserByEmail(email,{redirectTo,data:{land_club_invitation_id:id,land_club_roles:roles}});
  if(error||!data.user){await repository.markFailed(id,error?.message||'Provider did not create an invited user.');return {error:'The invitation could not be sent. The address may already have an account.'};}
  await repository.markPending(id,data.user.id);
 }catch(error){await repository.markFailed(id,error instanceof Error?error.message:'Invitation delivery failed.');return {error:'Invitation delivery is unavailable. Please try again later.'};}
 revalidatePath('/staff/members');
 return {error:'',message:`Invitation sent to ${email}.`};
}

export async function updateMemberRoles(_previous:RoleUpdateState,form:FormData):Promise<RoleUpdateState>{
 const actor=await requireStaff();
 const target=roleTargetSchema.safeParse({kind:form.get('targetKind'),id:form.get('targetId')});
 if(!target.success)return {error:'This member could not be identified.'};
 const roles=readRoles(form.getAll('roles'));
 const bootstrap=new Set((process.env.STAFF_USER_IDS||'').split(',').map(value=>value.trim()).filter(Boolean));
 if(target.data.kind==='user'&&bootstrap.has(target.data.id))return {error:'This Admin role is managed by the deployment configuration.'};
 try{
  const repository=new InvitationRepository(database());await repository.initialize();
  if(target.data.kind==='invitation')await repository.updatePendingRoles(target.data.id,roles);
  else await repository.replaceUserRoles(target.data.id,roles,actor.id);
 }catch{return {error:'Roles could not be updated. Refresh the page and try again.'};}
 revalidatePath('/staff/members');
 return {error:'',message:'Roles updated.'};
}
