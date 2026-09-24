import {redirect} from 'next/navigation';
import {staffIdentity} from '@/lib/staff';
import {currentUser} from '@/lib/auth/identity';
import {authConfigured} from '@/lib/auth/policy';
import {SignInForm} from './form';
export const dynamic='force-dynamic';
export default async function SignIn({searchParams}:{searchParams:Promise<{recovery?:string;password?:string;invitation?:string}>}){
 if(await staffIdentity())redirect('/staff');if(await currentUser())redirect('/account');
 const query=await searchParams;
 return <main className="auth signin-page"><div className="eyebrow">YOUR LAND CLUB</div><h1>A place to belong.</h1><p>Sign in to your account, or learn how to join by invitation.</p>{query.password==='updated'&&<p className="cms-success" role="status">Your password has been updated. Sign in with your new password.</p>}{query.invitation==='accepted'&&<p className="cms-success" role="status">Your Land Club account is ready. Sign in with your new password.</p>}{query.invitation==='invalid'&&<p className="cms-error" role="alert">That invitation is invalid, expired, or does not match this email address. Ask Land Club staff for a new invitation.</p>}{query.recovery==='invalid'&&<p className="cms-error" role="alert">That password reset link is invalid or has expired. Request a new link below.</p>}{authConfigured()?<SignInForm/>:<p role="status">Account sign-in has not been configured for this environment.</p>}<p className="muted">Staff access is by invitation. Contact your administrator if you need access.</p></main>;
}
