import {redirect} from 'next/navigation';
import {requireStaffPage} from '@/lib/staff';
export default async function Investors(){await requireStaffPage();redirect('/dashboard/members');}
