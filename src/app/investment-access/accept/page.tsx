import {sharingActor,sharingStore} from '@/lib/investment-sharing-store';
import {AcceptViewer} from '../forms';
import {RecipientAuth} from './auth-form';
import {signOut} from '@/app/signin/actions';
export default async function Page({searchParams}:{searchParams:Promise<{token?:string}>}){
 const {token=''}=await searchParams;
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return <><h1>Invitation unavailable</h1><p>Open the full link from your invitation email.</p></>;
 const actor=await sharingActor();
 if(!actor)return <><h1>View shared investments</h1><p>First, sign in with the verified email address that received the invitation.</p><RecipientAuth token={token}/></>;
 const store=await sharingStore(),invite=await store.ready()?await store.pending(actor,token):null;
 return <><h1>{invite?'Accept investment access':'Invitation unavailable'}</h1><p>Signed in as {actor.email}.</p>{invite?<section><h2>Your exact access</h2><ul>{invite.accounts.map((name,i)=><li key={i}>{name}</li>)}</ul><p>Read-only access to released, reviewed investment reports and their investment documents. You cannot edit, invite others or manage the owner’s account. Your own permissions and portfolio remain separate. The owner can revoke access at any time.</p><AcceptViewer token={token}/></section>:<p>This invitation may have expired, been accepted or revoked, or belong to a different email address. Return to your invitation after signing in with the matching account.</p>}<form action={signOut}><button>Sign out to use another account</button></form></>;
}
