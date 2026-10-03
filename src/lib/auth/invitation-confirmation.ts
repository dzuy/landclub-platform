import {z} from 'zod';

export const invitationLinkSchema=z.object({tokenHash:z.string().min(1).max(2048),type:z.literal('invite')});
export type ConfirmationState={error:string};
type Verification={user:{id:string;email?:string}|null;error:{code?:string;status?:number}|null};
type Dependencies={prepare:()=>Promise<void>;verify:(tokenHash:string)=>Promise<Verification>;isPending:(id:string,email:string)=>Promise<boolean>;signOut:()=>Promise<void>};

// Called only by the explicit form submission. Rendering or prefetching the
// email URL must never verify (and thereby consume) its single-use token.
export async function confirmInvitationLink(input:unknown,deps:Dependencies):Promise<ConfirmationState>{
 const parsed=invitationLinkSchema.safeParse(input);
 if(!parsed.success)return {error:'This invitation link is incomplete or invalid. Open the full link from your invitation email.'};
 let verified=false;
 try{
  // Check database availability before consuming the provider token.
  await deps.prepare();
  const result=await deps.verify(parsed.data.tokenHash);
  if(result.error){
   if(result.error.code==='otp_expired')return {error:'This invitation link has expired or has already been used. Ask Land Club staff for a fresh invitation.'};
   if(result.error.status===429||!result.error.status||result.error.status>=500)return {error:'Invitation verification is temporarily unavailable. Please try again shortly.'};
   return {error:'This invitation link could not be verified. Open the latest invitation email, or ask Land Club staff for a fresh invitation.'};
  }
  verified=true;
  if(result.user?.email&&await deps.isPending(result.user.id,result.user.email))return {error:''};
  await deps.signOut();
  return {error:'This invitation is no longer pending for this account. If you already created your password, sign in. Otherwise, contact Land Club staff.'};
 }catch{
  if(verified){try{await deps.signOut();}catch{/* Do not expose provider/session details. */}
   return {error:'Your link was verified, but we could not finish checking your invitation. Please contact Land Club staff for help before trying the link again.'};
  }
  return {error:'Invitation verification is temporarily unavailable. Please try again shortly.'};
 }
}
