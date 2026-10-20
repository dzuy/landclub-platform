import Link from 'next/link';
import {clubIdentity} from '@/lib/staff';
import {MemberDashboardShell} from '@/components/member-dashboard-shell';
import './sharing.css';
export const dynamic='force-dynamic';
export const metadata={title:'Investment sharing · Land Club',referrer:'no-referrer',robots:{index:false,follow:false}};
export default async function Layout({children}:{children:React.ReactNode}){
 const member=await clubIdentity();
 if(member)return <MemberDashboardShell sharing><div className="sharing-shell sharing-panel">{children}</div></MemberDashboardShell>;
 return <main className="sharing-shell"><nav aria-label="Sharing navigation"><Link href="/account">← Your account</Link><Link href="/investment-access">Investment sharing</Link></nav>{children}</main>;
}
