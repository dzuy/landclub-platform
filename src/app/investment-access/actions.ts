'use server';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {sharingActor,sharingStore} from '@/lib/investment-sharing-store';
import {sharingMailReady} from '@/lib/sharing-email';
import {deliverSharingInvitation} from '@/lib/investment-sharing-mail';
export type SharingState={error:string;message?:string};
export async function inviteInvestmentViewer(_state:SharingState,form:FormData):Promise<SharingState>{
 const actor=await sharingActor();if(!actor)return {error:'Sign in with your verified account.'};
 if(!sharingMailReady(process.env))return {error:'Sharing email delivery is not configured. No invitation was created.'};
 try{await (await sharingStore()).invite(actor,String(form.get('email')||''),form.getAll('positions').map(String),deliverSharingInvitation);}
 catch(error){return {error:error instanceof Error&&/^(Enter|Select|Owner|This person|Invitation delivery)/.test(error.message)?error.message:'Sharing is unavailable. Please try again later.'};}
 revalidatePath('/investment-access');return {error:'',message:'Invitation sent. Access begins only after the recipient accepts.'};
}
export async function revokeInvestmentViewer(_state:SharingState,form:FormData):Promise<SharingState>{
 const actor=await sharingActor();if(!actor)return {error:'Sign in with your verified account.'};
 try{await (await sharingStore()).revoke(actor,String(form.get('id')||''));}catch{return {error:'Unable to revoke this invitation. Refresh and try again.'};}
 revalidatePath('/investment-access');return {error:'',message:'Access revoked.'};
}
export async function acceptInvestmentSharing(_state:SharingState,form:FormData):Promise<SharingState>{
 const actor=await sharingActor();if(!actor)return {error:'Sign in with the verified invited email address.'};
 try{await (await sharingStore()).accept(actor,String(form.get('token')||''));}catch{return {error:'Invitation unavailable. Check the signed-in email, or ask the owner for a new invitation.'};}
 redirect('/investment-access');
}

async function adminSharingContext(){
 const [{authenticatedIdentity},{currentUser},{cookies},{PREVIEW_COOKIE}]=await Promise.all([import('@/lib/staff'),import('@/lib/auth/identity'),import('next/headers'),import('@/lib/dashboard-preview')]);
 const identity=await authenticatedIdentity(),user=await currentUser(),token=(await cookies()).get(PREVIEW_COOKIE)?.value;
 if(!identity?.admin||!user?.email||!user.email_confirmed_at||user.is_anonymous||!token)return null;
 return {actor:{id:identity.id,email:user.email,verified:true,admin:true},token};
}
export async function inviteInvestmentViewerOnBehalf(_state:SharingState,form:FormData):Promise<SharingState>{
 const ctx=await adminSharingContext();if(!ctx)return {error:'An active administrator View As session is required.'};
 if(form.get('confirmed')!=='yes')return {error:'Confirm the investor, recipient and investment scope before sending.'};
 if(!sharingMailReady(process.env))return {error:'Sharing email delivery is not configured. No invitation was created.'};
 try{await (await sharingStore()).inviteOnBehalf(ctx.actor,ctx.token,String(form.get('person')||''),String(form.get('email')||''),form.getAll('positions').map(String),deliverSharingInvitation);}
 catch{return {error:'Unable to send. Check the active View As session, owner authority and selected scope.'};}
 revalidatePath('/investment-access');return {error:'',message:'Invitation sent on behalf of the selected investor.'};
}
export async function revokeInvestmentViewerOnBehalf(_state:SharingState,form:FormData):Promise<SharingState>{
 const ctx=await adminSharingContext();if(!ctx)return {error:'An active administrator View As session is required.'};
 if(form.get('confirmed')!=='yes')return {error:'Confirm the investor and invitation before revoking.'};
 try{await (await sharingStore()).revokeOnBehalf(ctx.actor,ctx.token,String(form.get('person')||''),String(form.get('id')||''));}
 catch{return {error:'Unable to revoke. Check the active View As session and selected invitation.'};}
 revalidatePath('/investment-access');return {error:'',message:'Access revoked on behalf of the selected investor.'};
}
