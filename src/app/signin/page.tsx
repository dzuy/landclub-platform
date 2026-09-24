import {redirect} from 'next/navigation';
import {staffIdentity} from '@/lib/staff';
import {authConfigured} from '@/lib/auth/policy';
import {SignInForm} from './form';
export const dynamic='force-dynamic';
export default async function SignIn(){if(await staffIdentity())redirect('/staff/properties');return <main className="auth"><div className="eyebrow">LAND CLUB / STAFF</div><h1>Welcome back.</h1><p>Sign in with your staff account to manage property content.</p>{authConfigured()?<SignInForm/>:<p role="status">Staff sign-in has not been configured for this environment.</p>}<p className="muted">Staff accounts are provisioned by your administrator. Contact them for access or password recovery.</p><a href="/">← Explore Land Club</a></main>}
