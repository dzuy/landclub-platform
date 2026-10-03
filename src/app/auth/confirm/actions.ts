'use server';

import {redirect} from 'next/navigation';
import {authClient} from '@/lib/auth/client';
import {confirmInvitationLink,type ConfirmationState} from '@/lib/auth/invitation-confirmation';
import {database} from '@/lib/database';
import {InvitationRepository} from '@/lib/invitations';

export async function confirmInvitation(_previous:ConfirmationState,form:FormData):Promise<ConfirmationState>{
 // Server Actions are POST-only and enforce same-origin submission. No token
 // exchange occurs when a mail scanner simply fetches the confirmation page.
 let repository:InvitationRepository;
 let client:Awaited<ReturnType<typeof authClient>>;
 const result=await confirmInvitationLink({tokenHash:form.get('token_hash'),type:form.get('type')},{
  prepare:async()=>{client=await authClient();repository=new InvitationRepository(database());await repository.initialize();},
  verify:async tokenHash=>{const {data,error}=await client.auth.verifyOtp({token_hash:tokenHash,type:'invite'});return {user:data.user,error};},
  isPending:async(id,email)=>!!await repository.pendingForUser(id,email),
  signOut:async()=>{await client.auth.signOut({scope:'local'});},
 });
 if(result.error)return result;
 redirect('/accept-invite');
}
