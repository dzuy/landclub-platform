'use server';
import {redirect} from 'next/navigation';
import {z} from 'zod';
import {authClient} from '@/lib/auth/client';
import {isStaffUser} from '@/lib/auth/policy';
export async function signIn(_previous:{error:string},form:FormData){
 const input=z.object({email:z.email().max(254),password:z.string().min(1).max(1024)}).safeParse({email:form.get('email'),password:form.get('password')});
 if(!input.success)return {error:'Enter your email address and password.'};
 try{
  const client=await authClient();const {data,error}=await client.auth.signInWithPassword(input.data);
  if(error||!isStaffUser(data.user,process.env.STAFF_USER_IDS)){await client.auth.signOut({scope:'local'});return {error:'Unable to sign in. Check your credentials and staff access with your administrator.'};}
 }catch{return {error:'Sign-in is unavailable. Please try again later.'};}
 redirect('/staff');
}
export async function signOut(){const {error}=await (await authClient()).auth.signOut({scope:'local'});if(error)throw new Error('Sign-out failed. Please try again.');redirect('/signin');}
