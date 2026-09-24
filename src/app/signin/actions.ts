'use server';
import {redirect} from 'next/navigation';
import {cookies,headers} from 'next/headers';
import {z} from 'zod';
import {authClient} from '@/lib/auth/client';
import {isStaffUser,authConfigured} from '@/lib/auth/policy';
import {localStaffAllowed} from '@/lib/local-access';
export type AuthState={error:string;message?:string};
const credentials=z.object({email:z.email().max(254),password:z.string().min(1).max(1024)});
export async function signIn(_previous:AuthState,form:FormData):Promise<AuthState>{
 const input=credentials.safeParse({email:form.get('email'),password:form.get('password')});
 if(!input.success)return {error:'Enter your email address and password.'};
 let staff=false;
 try{
  const client=await authClient();const {data,error}=await client.auth.signInWithPassword(input.data);
  if(error||!data.user)return {error:'Unable to sign in. Check your email and password, and confirm your email if you recently created an account.'};
  staff=isStaffUser(data.user,process.env.STAFF_USER_IDS);
  (await cookies()).set('land-club-local-signed-out','1',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});
 }catch{return {error:'Sign-in is unavailable. Please try again later.'};}
 redirect(staff?'/staff':'/account');
}
export async function signOut(){
 if(authConfigured()){const {error}=await (await authClient()).auth.signOut({scope:'local'});if(error)throw new Error('Sign-out failed. Please try again.');}
 (await cookies()).set('land-club-local-signed-out','1',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});
 redirect('/signin');
}
export async function enterLocalPreview(){
 const h=await headers();if(!localStaffAllowed(process.env.NODE_ENV,process.env.LAND_CLUB_LOCAL_STAFF,h.get('host')||''))throw new Error('Local preview is unavailable.');
 (await cookies()).delete('land-club-local-signed-out');redirect('/staff');
}
