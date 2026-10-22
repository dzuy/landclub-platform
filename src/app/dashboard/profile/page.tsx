import {memberInvestmentStore} from '@/lib/member-investment-store';
import {investmentName} from '@/lib/member-investments';
import {store} from '@/lib/store';
import {roleLabels} from '@/lib/roles';
import {ProfilePhoto} from './photo';
import {profilePhotoUrl} from '@/lib/profile-photo';
import {PageHeading} from '@/components/page-heading';
import {currentUser} from '@/lib/auth/identity';
import {readProfile} from '@/lib/profile';
import {signOut} from '@/app/signin/actions';
import {requireMemberPage} from '@/lib/staff';
import {ProfileForm} from './form';

export default async function ProfilePage(){
 const actor=await requireMemberPage();
 if(actor.preview)return <><PageHeading title="Profile & Settings"/><section className="panel"><h2>{actor.name}</h2><dl className="profile-role"><dt>Role</dt><dd>{actor.roles.map(role=>roleLabels[role]).join(', ')||'No active club roles'}</dd><dt>Home region</dt><dd>{actor.profile?.homeRegion||'Not supplied'}</dd><dt>Phone</dt><dd>{actor.profile?.contactPhone||'Not supplied'}</dd></dl><p className="muted">You’re viewing this profile in read-only mode.</p></section></>;
 const user=await currentUser();
 const investments=user?await (await memberInvestmentStore()).get(user.id):null;
 const properties=investments?(await (await store()).list()).map(p=>({id:p.id,name:p.draft.name})):[];
 return <><PageHeading title="Profile & Settings"/><dl className="profile-role"><dt>Role</dt><dd>{actor.roles.map(role=>roleLabels[role]).join(', ')}</dd></dl>{user?<><section className="panel"><h2>Investments</h2>{investments?.entities.length?<ul>{investments.entities.map(entity=><li key={`${entity.kind}:${entity.id}`}>{investmentName(entity,properties)}</li>)}</ul>:<p className="muted">No investments recorded.</p>}</section><ProfilePhoto initialUrl={profilePhotoUrl(user.id,user.user_metadata)}/><ProfileForm initial={readProfile(user.user_metadata)} email={user.email||''}/></>:<section className="panel"><h2>Sign in to save your profile.</h2><p>The local dashboard preview has no personal account. Sign in with your Land Club account to save your name and preferences.</p><form action={signOut}><button>Go to sign in</button></form></section>}</>;
}
