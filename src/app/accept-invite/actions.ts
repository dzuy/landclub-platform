'use server';
import {redirect} from 'next/navigation';
import {cookies} from 'next/headers';
import {currentUser} from '@/lib/auth/identity';
import {authClient} from '@/lib/auth/client';
import {database} from '@/lib/database';
import {InvitationRepository} from '@/lib/invitations';
import {newPasswordSchema} from '@/lib/auth/recovery';
import type {AuthState} from '@/app/signin/actions';

export async function acceptInvitation(_previous:AuthState,form:FormData):Promise<AuthState>{
 const input=newPasswordSchema.safeParse({password:form.get('password'),confirmPassword:form.get('confirmPassword')});
 if(!input.success)return {error:'Use at least 8 characters and make sure both passwords match.'};
 const user=await currentUser();if(!user?.email)return {error:'This invitation is invalid or has expired.'};
 const repository=new InvitationRepository(database());await repository.initialize();const invitation=await repository.pendingForUser(user.id,user.email);
 if(!invitation)return {error:'This invitation does not match the signed-in email address.'};
 try{
  const client=await authClient();const {error}=await client.auth.updateUser({password:input.data.password});if(error)return {error:'We could not create your account. Try a different password or request a new invitation.'};
  await repository.accept(invitation.id,user.id);await client.auth.signOut({scope:'local'});
  (await cookies()).set('land-club-local-signed-out','1',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});
 }catch{return {error:'We could not finish creating your account. Please try again.'};}
 redirect('/signin?invitation=accepted');
}
