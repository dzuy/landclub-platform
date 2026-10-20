import {MemberDashboardShell} from '@/components/member-dashboard-shell';
export const dynamic='force-dynamic';
export default function Layout({children}:{children:React.ReactNode}){return <MemberDashboardShell>{children}</MemberDashboardShell>;}
