import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth/identity';
import {staffIdentity} from '@/lib/staff';
import {signOut} from '@/app/signin/actions';
export default async function Account(){if(await staffIdentity())redirect('/staff');const user=await currentUser();if(!user)redirect('/signin');return <main className="auth"><div className="eyebrow">YOUR LAND CLUB</div><h1>Welcome to the club.</h1><p>You’re signed in as {user.email}.</p><p>Your account is ready. Property memberships and staff access are assigned separately by the Land Club team.</p><a className="button secondary" href="/">Explore properties ↗</a><form action={signOut} className="local-preview-entry"><button>Sign out</button></form></main>}
