import {startPreview} from '../investors/actions';
import s from '@/components/ian-investor-mock.module.css';
import Link from 'next/link';
import {requireMemberPage} from '@/lib/staff';
import {investorPlatformStore} from '@/lib/investor-platform-store';
import {investorReportStore} from '@/lib/investor-report-store';
import {RealInvestorPortfolio} from '@/components/real-investor-portfolio';
export const dynamic='force-dynamic';
export default async function PortfolioPage(){
 const actor=await requireMemberPage(),store=await investorPlatformStore();
 if(!await store.ready())return <><h1>Your portfolio</h1><p>Investor reporting setup is pending.</p></>;
 const repo=await investorReportStore(),effective={...actor,admin:false},list=await repo.list(effective),reports=(await Promise.all(list.map(r=>repo.get(r.id,effective)))).filter(r=>r!==null);
 const people=actor.admin?await store.people(actor):[];
 return <>{actor.admin&&<section className={s.adminPreview}><strong>Preview an investor’s portfolio</strong><p>Choose Ian or Scott to see this Portfolio design with their real records. Draft figures are visible only to you.</p>{people.map(p=><form key={p.id} action={startPreview}><input type="hidden" name="person" value={p.id}/><input type="hidden" name="mode" value="draft"/><button>View as {p.display_name.split(' ')[0]}</button></form>)}<br/><Link href="/dashboard/members">Manage investments in Members →</Link></section>}<RealInvestorPortfolio name="" reports={reports} statements={await store.statements(reports.map(r=>r.id))}/></>;
}
