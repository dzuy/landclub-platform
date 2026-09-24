import {DashboardPage} from '@/components/dashboard-page';
import {currentUser} from '@/lib/auth/identity';
import {readProfile} from '@/lib/profile';
import {requireStaffPage} from '@/lib/staff';
export default async function Page(){const actor=await requireStaffPage();const user=await currentUser();const savedName=user?readProfile(user.user_metadata).displayName:'';return <DashboardPage section="home" name={savedName||actor?.name||''}/>;}
