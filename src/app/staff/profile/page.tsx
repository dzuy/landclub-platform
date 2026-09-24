import {currentUser} from '@/lib/auth/identity';
import {readProfile} from '@/lib/profile';
import {signOut} from '@/app/signin/actions';
import {requireMemberPage} from '@/lib/staff';
import {ProfileForm} from './form';

export default async function ProfilePage(){
 await requireMemberPage();
 const user=await currentUser();
 return <><header className="dashboard-heading"><div className="eyebrow">YOUR ACCOUNT</div><h1>A little about you.</h1><p>Your details and how you’d like to hear from the club.</p></header>{user?<ProfileForm initial={readProfile(user.user_metadata)} email={user.email||''}/>:<section className="panel"><h2>Sign in to save your profile.</h2><p>The local dashboard preview has no personal account. Sign in with your Land Club account to save your name and preferences.</p><form action={signOut}><button>Go to sign in</button></form></section>}</>;
}
