import Link from 'next/link';
import {requireStaffPage} from '@/lib/staff';
import {loadInvestorSourceReview} from '@/lib/investor-source-store';
import {sourceMoney} from '@/lib/investor-source-review';
import {simpleAccrual,loanInterest,cents,decimal} from '@/lib/investor-calculations';
import s from '@/components/investor-portfolio.module.css';
export const dynamic='force-dynamic';
export default async function Calculations({searchParams}:{searchParams:Promise<{asOf?:string}>}){
 const actor=await requireStaffPage();const {books}=await loadInvestorSourceReview(actor),q=await searchParams,asOf=q.asOf??'2026-10-16';
 const rows=(tab:string)=>books.flatMap(b=>b.tabs.filter(t=>t.name===tab).flatMap(t=>t.rows));
 const events=rows('transactions');let error='',results:{title:string;value:unknown}[]=[];
 try{
 const ian=events.filter(e=>e.position_id==='POS-001').map(e=>({date:e.txn_date!,amount:decimal(cents(sourceMoney(e.amount)!)*(e.txn_type==='return_of_capital'?-1n:1n))}));
 const scott=events.filter(e=>e.position_id==='POS-006'),paid=scott.filter(e=>e.txn_type==='interest_payment').reduce((sum,e)=>sum+cents(sourceMoney(e.amount)!),0n);
 const reserve=rows('positions').find(p=>p.position_id==='POS-102')!;
 const baseline=rows('balance_snapshots').find(p=>p.position_id==='POS-101')!;
 if(asOf<'2026-10-16')throw new Error('This review uses evidence through October 16; choose that date or later.');
 results=[{title:'Ian · preferred return (source segment rounding)',value:simpleAccrual(ian,asOf,1000,'segments')},{title:'Scott · Norden earned / prepaid interest (cent precision)',value:loanInterest(scott.filter(e=>e.txn_type==='loan_funding').map(e=>({date:e.txn_date!,amount:sourceMoney(e.amount)!})),decimal(paid),asOf,1000)},{title:'Scott · Reserve interest scenario',value:simpleAccrual([{date:reserve.start_date!,amount:sourceMoney(reserve.amount)!}],asOf,1000)},{title:'Scott · Sutter since last recorded payment (source opening balance)',value:simpleAccrual([{date:'2026-09-04',amount:sourceMoney(baseline.principal_or_deposits)!}],asOf,1000)}];
 }catch(e){error=e instanceof Error?e.message:'Invalid inputs';}
 return <div className={s.page}><Link href="/dashboard/investor-data">‹ Investment source data</Link><h1>Calculation review</h1><p className={s.banner}>Admin-only scenarios. Source rates and terms are unconfirmed. These results are not written to portfolios, statements or payment instructions.</p><p>Assumes no activity after the October 16 source cutoff. Actual/365, start included and end excluded. Loan source snapshots round to whole dollars; this engine retains cents. Sutter starts from the reported post-payment balance rather than reconstructing unresolved loan terms.</p><form className={s.form}><label>Calculate through<input type="date" name="asOf" defaultValue={asOf} min="2026-10-16" required/></label><button className={s.button}>Compare</button></form>{error&&<p role="alert" className={s.error}>{error}</p>}{results.map(r=><section className={s.card} key={r.title}><h2>{r.title}</h2><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(r.value,null,2)}</pre></section>)}</div>;
}
