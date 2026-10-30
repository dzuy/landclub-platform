import {notFound} from 'next/navigation';
import {requireStaffPage} from '@/lib/staff';
import {investorPlatformStore} from '@/lib/investor-platform-store';
import {RealInvestorPortfolio} from '@/components/real-investor-portfolio';
import {exitPreview} from '../../investors/actions';
import s from '@/components/investor-portfolio.module.css';
export const dynamic='force-dynamic';
export default async function Preview({params}:{params:Promise<{token:string}>}){
 const admin=await requireStaffPage(),{token}=await params,store=await investorPlatformStore(),ctx=await store.preview(token,admin);if(!ctx)notFound();
 const list=await ctx.repo.list(ctx.actor),reports=(await Promise.all(list.map(r=>ctx.repo.get(r.id,ctx.actor)))).filter(r=>r!==null);
 return <><div className={s.banner}><div><strong>{ctx.mode==='draft'?'Previewing investments:':'Viewing as'} {ctx.person.display_name}</strong><br/>{ctx.mode==='draft'?'Draft figures · visible only to admins.':'Published investor view.'} Read-only preview.</div><form action={exitPreview}><input type="hidden" name="token" value={token}/><button className={s.button}>Exit preview</button></form></div><RealInvestorPortfolio name={ctx.person.display_name} previewToken={token} reports={reports} statements={await store.statements(reports.map(r=>r.id))} preview base={`/dashboard/investor-preview/${token}`} downloadBase={`/api/investor-preview/${token}`}/></>;
}
