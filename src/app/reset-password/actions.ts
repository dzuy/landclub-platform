'use server';
import {redirect} from 'next/navigation';
import {cookies} from 'next/headers';
import {authClient} from '@/lib/auth/client';
import {newPasswordSchema} from '@/lib/auth/recovery';
import type {AuthState} from '@/app/signin/actions';

export async function updatePassword(_previous:AuthState,form:FormData):Promise<AuthState>{
 const input=newPasswordSchema.safeParse({password:form.get('password'),confirmPassword:form.get('confirmPassword')});
 if(!input.success)return {error:'Use at least 8 characters and make sure both passwords match.'};
 try{
  const client=await authClient();
  const {data:{user},error:userError}=await client.auth.getUser();
  if(userError||!user)return {error:'This reset link is invalid or has expired. Request a new one.'};
  const {error}=await client.auth.updateUser({password:input.data.password});
  if(error)return {error:'We could not update your password. Try a different password or request a new link.'};
  await client.auth.signOut({scope:'local'});
  (await cookies()).set('land-club-local-signed-out','1',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});
 }catch{return {error:'Password recovery is unavailable. Please try again later.'};}
 redirect('/signin?password=updated');
}
