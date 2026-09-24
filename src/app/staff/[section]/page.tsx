import {notFound} from 'next/navigation';
import {DashboardPage} from '@/components/dashboard-page';
import {requireStaffPage} from '@/lib/staff';
const sections=['my-properties','bookings','documents','events','stay','updates','maintenance','administration'];
export default async function Page({params}:{params:Promise<{section:string}>}){const actor=await requireStaffPage();const {section}=await params;if(!sections.includes(section))notFound();return <DashboardPage section={section} email={actor?.local?'':actor?.name||''}/>;}
