import {cookies} from 'next/headers';
import {authenticatedIdentity} from '@/lib/staff';
import {PREVIEW_COOKIE} from '@/lib/dashboard-preview';
import {InvestmentTermsRepository} from '@/lib/investment-terms-repository';
import {startPreview} from '../investors/actions';
import s from '@/components/ian-investor-mock.module.css';
import Link from 'next/link';
import {requireMemberPage} from '@/lib/staff';
import {investorPlatformStore} from '@/lib/investor-platform-store';
import {investorReportStore} from '@/lib/investor-report-store';
import {RealInvestorPortfolio} from '@/components/real-investor-portfolio';
export const dynamic='force-dynamic';
export default async function PortfolioPage({searchParams}:{searchParams:Promise<{asOf?:string}>}){
 const q=await searchParams,asOf=q.asOf||new Date().toISOString().slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||!Number.isFinite(Date.parse(asOf))||new Date(asOf).toISOString().slice(0,10)!==asOf)return <p>Choose a valid calculation date.</p>;
 const actor=await requireMemberPage(),store=await investorPlatformStore();
 if(!await store.ready())return <><h1>Your investments</h1><p>Investor reporting setup is pending.</p></>;
 const repo=await investorReportStore(),effective={...actor,admin:false},list=await repo.list(effective),reports=(await Promise.all(list.map(r=>repo.get(r.id,effective)))).filter(r=>r!==null);
 const accruals:Record<string,Awaited<ReturnType<InvestmentTermsRepository['forReport']>>>={};
 const termsRepo=new InvestmentTermsRepository(store.db);
 const admin=actor.preview?await authenticatedIdentity():null,previewToken=actor.preview?(await cookies()).get(PREVIEW_COOKIE)?.value:null;
 for(const r of reports)accruals[r.id]=actor.preview?(admin?.admin&&previewToken?await termsRepo.forPreview(r.id,asOf,previewToken,admin):null):await termsRepo.forReport(r.id,asOf,effective);
 const people=actor.admin?await store.people(actor):[];
 return <>{actor.admin&&<section className={s.adminPreview}><strong>Preview an investor’s investments</strong><p>Choose Ian or Scott to see their investments with real records. Draft figures are visible only to you.</p>{people.map(p=><form key={p.id} action={startPreview}><input type="hidden" name="person" value={p.id}/><input type="hidden" name="mode" value="draft"/><button>View as {p.display_name.split(' ')[0]}</button></form>)}<br/><Link href="/dashboard/members">Manage investments in Members →</Link></section>}{reports.length>0&&<form><label>Calculation as of <input type="date" name="asOf" defaultValue={asOf}/></label><button>Update calculation date</button></form>}<RealInvestorPortfolio name="" reports={reports} accruals={accruals} statements={await store.statements(reports.map(r=>r.id))}/></>;
}
