import {requireMemberPage} from '@/lib/staff';
import {IanReportsMock} from '@/components/ian-investor-mock';
export default async function PortfolioReportsPage(){await requireMemberPage();return <IanReportsMock/>;}
