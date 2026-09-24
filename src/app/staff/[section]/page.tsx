import {notFound} from 'next/navigation';
import {DashboardPage} from '@/components/dashboard-page';
import {currentUser} from '@/lib/auth/identity';
import {readProfile} from '@/lib/profile';
import {requireStaffPage} from '@/lib/staff';
const sections=['my-properties','bookings','documents','events','stay','updates','maintenance','administration'];
export default async function Page({params}:{params:Promise<{section:string}>}){const actor=await requireStaffPage();const {section}=await params;if(!sections.includes(section))notFound();const user=await currentUser();const savedName=user?readProfile(user.user_metadata).displayName:'';return <DashboardPage section={section} name={savedName||actor?.name||''}/>;}
