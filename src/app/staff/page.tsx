import {DashboardPage} from '@/components/dashboard-page';
import {requireStaffPage} from '@/lib/staff';
export default async function Page(){const actor=await requireStaffPage();return <DashboardPage section="home" email={actor?.local?'':actor?.name||''}/>;}
