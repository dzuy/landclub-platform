import Link from 'next/link';
import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth/identity';
import {ResetPasswordForm} from './form';

export const dynamic='force-dynamic';
export default async function ResetPasswordPage(){
 if(!await currentUser())redirect('/signin?recovery=invalid');
 return <main className="auth"><div className="eyebrow">YOUR LAND CLUB</div><h1>Choose a new password.</h1><p>Set a new password for your Land Club account. Afterward, you’ll sign in again with your new password.</p><ResetPasswordForm/><Link href="/signin">Return to sign in</Link></main>;
}
