import {redirect} from 'next/navigation';
import {headers} from 'next/headers';
import {staffIdentity} from '@/lib/staff';
import {currentUser} from '@/lib/auth/identity';
import {authConfigured} from '@/lib/auth/policy';
import {localStaffAllowed} from '@/lib/local-access';
import {enterLocalPreview} from './actions';
import {SignInForm} from './form';
export const dynamic='force-dynamic';
export default async function SignIn(){
 if(await staffIdentity())redirect('/staff');if(await currentUser())redirect('/account');
 const local=localStaffAllowed(process.env.NODE_ENV,process.env.LAND_CLUB_LOCAL_STAFF,(await headers()).get('host')||'');
 return <main className="auth"><div className="eyebrow">YOUR LAND CLUB</div><h1>A place to belong.</h1><p>Sign in to your account, or learn how to join by invitation.</p>{authConfigured()?<SignInForm/>:<p role="status">Account sign-in has not been configured for this environment.</p>}<p className="muted">Staff access is by invitation. Contact your administrator if you need access or password recovery.</p>{local&&<form action={enterLocalPreview} className="local-preview-entry"><p className="muted">Local development only</p><button className="secondary">Enter local dashboard preview</button></form>}<a href="/">← Explore Land Club</a></main>;
}
