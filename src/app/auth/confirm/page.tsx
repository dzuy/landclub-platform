import type {Metadata} from 'next';
import {invitationLinkSchema} from '@/lib/auth/invitation-confirmation';
import {ConfirmInvitationForm} from './form';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Your invitation · Land Club',referrer:'no-referrer',robots:{index:false,follow:false}};

export default async function ConfirmInvitationPage({searchParams}:{searchParams:Promise<{token_hash?:string|string[];type?:string|string[]}>}){
 const query=await searchParams;
 const link=invitationLinkSchema.safeParse({tokenHash:query.token_hash,type:query.type});
 return <main className="auth"><div className="eyebrow">WELCOME TO LAND CLUB</div><h1>Your invitation.</h1>
  {link.success?<><p>Accept your invitation to continue. You’ll choose your own password on the next page.</p><ConfirmInvitationForm tokenHash={link.data.tokenHash}/></>:<p className="cms-error" role="alert">This invitation link is incomplete or invalid. Open the full link from your invitation email.</p>}
  <p className="muted">Already created your account? <a href="/signin">Sign in</a>.</p>
 </main>;
}
