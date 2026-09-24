import {currentUser} from '@/lib/auth/identity';
import {isStaffUser} from '@/lib/auth/policy';
import {readProfile} from '@/lib/profile';
import {signOut} from '@/app/signin/actions';
import {ProfileForm} from './form';

export default async function ProfilePage(){
 const user=await currentUser();
 return <><header className="dashboard-heading"><div className="eyebrow">YOUR ACCOUNT</div><h1>A little about you.</h1><p>Your details and how you’d like to hear from the club.</p></header>{user&&isStaffUser(user,process.env.STAFF_USER_IDS)?<ProfileForm initial={readProfile(user.user_metadata)} email={user.email||''}/>:<section className="panel"><h2>Sign in to save your profile.</h2><p>The local dashboard preview has no personal account. Sign in with your Land Club account to save your name and preferences.</p><form action={signOut}><button>Go to sign in</button></form></section>}</>;
}
