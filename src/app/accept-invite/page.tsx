import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth/identity';
import {database} from '@/lib/database';
import {InvitationRepository} from '@/lib/invitations';
import {roleLabels} from '@/lib/roles';
import {AcceptInvitationForm} from './form';

export const dynamic='force-dynamic';
export default async function AcceptInvitePage(){
 const user=await currentUser();if(!user?.email)redirect('/signin?invitation=invalid');
 const repository=new InvitationRepository(database());await repository.initialize();const invitation=await repository.pendingForUser(user.id,user.email);if(!invitation)redirect('/signin?invitation=invalid');
 return <main className="auth"><div className="eyebrow">WELCOME TO LAND CLUB</div><h1>Create your account.</h1><p>Your invitation is reserved for <strong>{invitation.email}</strong>.</p><p className="muted">Roles: {invitation.roles.map(role=>roleLabels[role]).join(', ')}</p><AcceptInvitationForm/></main>;
}
