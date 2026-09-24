import {redirect} from 'next/navigation';
import {clubIdentity} from '@/lib/staff';
import {DashboardNav} from '@/components/dashboard-nav';
export const dynamic='force-dynamic';
export default async function StaffLayout({children}:{children:React.ReactNode}){
 const actor=await clubIdentity();if(!actor)redirect('/signin');
 return <>{actor.local&&<div className="local-mode"><strong>Local development workspace</strong><span>Property edits are saved on this computer.</span></div>}<div className="cms-shell dashboard-shell"><DashboardNav showAdminTools={actor.admin}/><main className="cms-main dashboard-main">{children}</main></div></>;
}
