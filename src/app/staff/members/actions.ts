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
export type CancelInvitationState={error:string;message?:string};
const emailSchema=z.email().max(254);
const roleTargetSchema=z.object({kind:z.enum(['user','invitation','prepared']),id:z.uuid()});
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
  if(target.data.kind==='prepared'){const {preparedMemberStore}=await import('@/lib/prepared-member-store');await (await preparedMemberStore()).saveRoles(target.data.id,roles);}
  else if(target.data.kind==='invitation')await repository.updatePendingRoles(target.data.id,roles);
  else await repository.replaceUserRoles(target.data.id,roles,actor.id);
 }catch{return {error:'Roles could not be updated. Refresh the page and try again.'};}
 revalidatePath('/staff/members','layout');
 return {error:'',message:'Roles updated.'};
}

export async function cancelInvitation(_previous:CancelInvitationState,form:FormData):Promise<CancelInvitationState>{
 const actor=await requireStaff();
 const id=z.uuid().safeParse(form.get('invitationId'));
 if(!id.success)return {error:'This invitation could not be identified.'};
 const repository=new InvitationRepository(database());
 try{
  await repository.initialize();
  const invitation=await repository.activeById(id.data);
  if(!invitation)return {error:'This invitation is no longer pending.'};
  if(invitation.status==='sending')return {error:'This invitation is still being sent. Check its delivery status before cancelling.'};
  const {preparedMemberStore}=await import('@/lib/prepared-member-store');
  const {memberPropertyStore}=await import('@/lib/member-property-store');
  const prepared=await preparedMemberStore();await memberPropertyStore();
  if(invitation.authUserId){
   const admin=authAdminClient();
   const {data,error}=await admin.auth.admin.getUserById(invitation.authUserId);
   if(error&&error.status!==404)throw error;
   const invitedUser=data.user;
   if(invitedUser?.last_sign_in_at||invitedUser?.email_confirmed_at)return {error:'This person has already created their account. Refresh the page to see their current status.'};
   if(invitedUser){
    const {error:deleteError}=await admin.auth.admin.deleteUser(invitation.authUserId);
    if(deleteError&&deleteError.status!==404)throw deleteError;
   }
  }
  await prepared.cancelInvitation(id.data,actor.id);
 }catch{return {error:'The invitation could not be cancelled. Refresh the page and try again.'};}
 revalidatePath('/staff/members','layout');
 return {error:'',message:'Invitation cancelled. Any saved member setup is available as a draft, ready to invite again.'};
}

export async function createPreparedMember(_previous:InvitationState,form:FormData):Promise<InvitationState>{
 const actor=await requireStaff();
 const {preparedMemberSchema}=await import('@/lib/prepared-members');
 const {preparedMemberStore}=await import('@/lib/prepared-member-store');
 const input=preparedMemberSchema.safeParse({email:String(form.get('email')||'').trim().toLowerCase(),displayName:form.get('displayName'),homeRegion:form.get('homeRegion')||'',contactPhone:form.get('contactPhone')||''});
 if(!input.success)return {error:input.error.issues[0].message};
 try{
  const result=await (await preparedMemberStore()).createOrReuseDraft(randomUUID(),input.data,readRoles(form.getAll('roles')),actor.id);
  if(result==='unavailable')return {error:'This email already has an invitation or account. Open the existing member in the directory.'};
  if(result==='existing'){revalidatePath('/staff/members','layout');return {error:'',message:'Their saved member draft is ready. Open their name below to review the setup and send a new invitation.'};}
 }
 catch{return {error:'Unable to prepare this member. This email may already have a prepared account.'};}
 revalidatePath('/staff/members');return {error:'',message:`${input.data.displayName} is ready to configure. Open their name below to add properties and send their invitation.`};
}

export async function invitePreparedMember(_previous:InvitationState,form:FormData):Promise<InvitationState>{
 const actor=await requireStaff();const parsed=z.uuid().safeParse(form.get('preparedId'));if(!parsed.success)return {error:'Member not found.'};
 const {preparedMemberStore}=await import('@/lib/prepared-member-store');
 const {memberPropertyStore}=await import('@/lib/member-property-store');
 const prepared=await preparedMemberStore();
 const invitations=new InvitationRepository(database());await invitations.initialize();await memberPropertyStore();
 // Resolve configuration before claiming the draft, so missing settings do not lock it.
 let admin:ReturnType<typeof authAdminClient>,redirectTo:string;
 try{admin=authAdminClient();redirectTo=new URL('/auth/confirm',canonicalSiteUrl((await headers()).get('origin'),process.env.LAND_CLUB_SITE_URL,process.env.NODE_ENV)).toString();}
 catch{return {error:'Invitation delivery is not configured. Your member setup is saved.'};}
 const existing=await prepared.get(parsed.data);
 if(existing?.status==='sending'&&existing.invitation_id){
  try{
   // A provider timeout may still have delivered the email. Reconcile instead of resending.
   let page=1;
   while(true){const {data,error}=await admin.auth.admin.listUsers({page,perPage:1000});if(error)throw error;
    const user=data.users.find(user=>user.email?.toLowerCase()===existing.email&&user.user_metadata?.land_club_invitation_id===existing.invitation_id);
    if(user){await prepared.finishDelivery(existing.id,user.id,existing.invitation_id);revalidatePath('/staff/members');return {error:'',message:'Invitation confirmed. Their profile and property associations are ready.'};}
    if(data.users.length<1000)break;page++;
   }
  }catch{return {error:'Unable to check delivery right now. Your setup is saved; try checking again later.'};}
  return {error:'Delivery is not yet confirmed. Your setup is saved. Check again shortly; no additional email has been sent.'};
 }
 const invitationId=randomUUID();
 let member;
 try{member=await prepared.beginDelivery(parsed.data,invitationId);}catch{return {error:'This invitation is already being sent or has been sent. Refresh the page.'};}
 try{await invitations.begin(invitationId,member.email,member.roles,actor.id);}catch{await prepared.deliveryFailed(member.id);return {error:'This email already has an active invitation. Your setup is saved.'};}
 const {displayName,homeRegion,contactPhone}=member.info;
 try{
  const {data,error}=await admin.auth.admin.inviteUserByEmail(member.email,{redirectTo,data:{display_name:displayName,home_region:homeRegion,contact_phone:contactPhone,land_club_invitation_id:invitationId}});
  if(error||!data.user){await invitations.markFailed(invitationId,'Invitation provider rejected delivery.');await prepared.deliveryFailed(member.id);return {error:'The invitation could not be sent. This email may already have an account. Your setup is saved.'};}
  await prepared.finishDelivery(member.id,data.user.id,invitationId);
 }catch{return {error:'Delivery could not be confirmed. The setup is preserved and sending is paused to prevent duplicate invitations. Use Check invitation status to confirm delivery without sending another email.'};}
 revalidatePath('/staff/members');return {error:'',message:`Invitation sent to ${member.email}. Their profile and property associations are ready.`};
}
