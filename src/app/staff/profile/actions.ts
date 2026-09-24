'use server';
import {revalidatePath} from 'next/cache';
import {authClient} from '@/lib/auth/client';
import {clubUserAuthorized} from '@/lib/staff';
import {profileSchema,profileMetadata,type Profile} from '@/lib/profile';
export type ProfileResult={error?:string;saved?:Profile};
export async function saveProfile(input:Profile):Promise<ProfileResult>{
 const parsed=profileSchema.safeParse(input);
 if(!parsed.success)return {error:parsed.error.issues[0]?.message||'Check your profile details.'};
 try{
  const client=await authClient();
  const {data:{user},error:identityError}=await client.auth.getUser();
  if(identityError||!await clubUserAuthorized(user))return {error:'Sign in with your Land Club account to save your profile.'};
  // Only self-service profile metadata is accepted. Roles and account identity
  // are never derived from editable user metadata.
  const {error}=await client.auth.updateUser({data:profileMetadata(parsed.data)});
  if(error)return {error:'Your changes could not be saved. Please try again.'};
  revalidatePath('/staff/profile');
  return {saved:parsed.data};
 }catch{return {error:'Profile saving is unavailable. Your changes have not been saved.'};}
}
