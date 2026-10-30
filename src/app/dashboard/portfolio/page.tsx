import {cookies} from 'next/headers';
import {PREVIEW_COOKIE} from '@/lib/dashboard-preview';
import {requireMemberPage} from '@/lib/staff';
import {investorPlatformStore} from '@/lib/investor-platform-store';
import {investorReportStore} from '@/lib/investor-report-store';
import {RealInvestorPortfolio} from '@/components/real-investor-portfolio';
export const dynamic='force-dynamic';
export default async function PortfolioPage(){
 const actor=await requireMemberPage(),store=await investorPlatformStore();
 if(!await store.ready())return <><h1>Your investments</h1><p>Investor reporting setup is pending.</p></>;
 const repo=await investorReportStore(),effective={...actor,admin:false},list=await repo.list(effective),reports=(await Promise.all(list.map(r=>repo.get(r.id,effective)))).filter(r=>r!==null);
 const previewToken=actor.preview?(await cookies()).get(PREVIEW_COOKIE)?.value:null;
 return <RealInvestorPortfolio name="" reports={reports} previewToken={previewToken??undefined} statements={await store.statements(reports.map(r=>r.id))}/>;
}
