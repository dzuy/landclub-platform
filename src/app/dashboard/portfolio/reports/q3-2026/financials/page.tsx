import {requireMemberPage} from '@/lib/staff';
import {IanQuarterlyUpdate} from '@/components/ian-quarterly-update';
export default async function Page(){await requireMemberPage();return <IanQuarterlyUpdate financials/>;}
