import {notFound} from 'next/navigation';
import {requireMemberPage} from '@/lib/staff';
import {investorReportStore} from '@/lib/investor-report-store';
import {InvestorReportView} from '@/components/investor-report';
export const dynamic='force-dynamic';
export default async function ReportPage({params}:{params:Promise<{id:string}>}){
 const actor=await requireMemberPage();
 const report=await (await investorReportStore()).get((await params).id,actor);
 if(!report)notFound();
 return <InvestorReportView report={report}/>;
}
