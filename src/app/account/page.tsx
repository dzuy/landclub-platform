import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth/identity';
import {clubIdentity} from '@/lib/staff';
import {signOut} from '@/app/signin/actions';
export default async function Account(){if(await clubIdentity())redirect('/staff');const user=await currentUser();if(!user)redirect('/signin');return <main className="auth"><div className="eyebrow">YOUR LAND CLUB</div><h1>Welcome to the club.</h1><p>You’re signed in as {user.email}.</p><p>Your account is ready. Land Club access is assigned by invitation.</p><a className="button secondary" href="/">Explore properties</a><form action={signOut} className="local-preview-entry"><button>Sign out</button></form></main>}
