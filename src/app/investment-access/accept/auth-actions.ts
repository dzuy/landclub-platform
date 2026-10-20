'use server';
import {z} from 'zod';
import {redirect} from 'next/navigation';
import {authClient} from '@/lib/auth/client';
import {canonicalSiteUrl} from '@/lib/auth/recovery';
import type {SharingState} from '../actions';
export async function authenticateRecipient(_state:SharingState,form:FormData):Promise<SharingState>{
 const input=z.object({email:z.email().max(254),password:z.string().min(8).max(1024),token:z.string().regex(/^[A-Za-z0-9_-]{43}$/),mode:z.enum(['signin','create'])}).safeParse(Object.fromEntries(form));
 if(!input.success)return {error:'Enter a valid email and password of at least 8 characters.'};
 const {email,password,token,mode}=input.data;
 try{
  const client=await authClient();
  if(mode==='create'){
   const target=new URL('/investment-access/auth',canonicalSiteUrl(null,process.env.LAND_CLUB_SITE_URL,process.env.NODE_ENV));target.searchParams.set('token',token);
   const {error}=await client.auth.signUp({email,password,options:{emailRedirectTo:target.toString()}});
   if(error)return {error:'Account creation is unavailable. If you already have an account, sign in instead.'};
   return {error:'',message:'Check your inbox to verify your email, then return to this invitation. Creating an account does not accept access.'};
  }
  const {data,error}=await client.auth.signInWithPassword({email,password});
  if(error||!data.user?.email_confirmed_at)return {error:'Unable to sign in. Check your email, password and email verification.'};
 }catch{return {error:'Authentication is unavailable. Please try again later.'};}
 redirect(`/investment-access/accept?token=${encodeURIComponent(token)}`);
}
