import {redirect} from 'next/navigation';
import {staffIdentity} from '@/lib/staff';
import {signOut} from '@/app/signin/actions';
import {DashboardNav} from '@/components/dashboard-nav';
export const dynamic='force-dynamic';
export default async function StaffLayout({children}:{children:React.ReactNode}){
 const actor=await staffIdentity();if(!actor)redirect('/signin');
 return <>{actor.local&&<div className="local-mode"><strong>Local development workspace</strong><span>Property edits are saved on this computer.</span></div>}<div className="cms-shell dashboard-shell"><aside className="cms-sidebar dashboard-sidebar"><div className="eyebrow">YOUR LAND CLUB</div><DashboardNav/><div className="dashboard-account"><span className="badge">Staff access</span><p>{actor.name}</p>{!actor.local&&<form action={signOut}><button className="secondary">Sign out</button></form>}</div></aside><main className="cms-main dashboard-main">{children}</main></div></>;
}
