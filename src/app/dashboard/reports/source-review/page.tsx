import Link from 'next/link';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {requireMemberPage} from '@/lib/staff';
import {loadLocalSourceReview,localSourceReviewAllowed} from '@/lib/investor-source-store';
import {InvestorReportView} from '@/components/investor-report';
import {sourceMoney} from '@/lib/investor-source-review';
import {reportAmount} from '@/lib/investor-reports';
export const dynamic='force-dynamic';
export default async function SourceReview({searchParams}:{searchParams:Promise<{position?:string;book?:string;tab?:string}>}){
 const actor=await requireMemberPage();if(!localSourceReviewAllowed(actor,process.env.NODE_ENV,(await headers()).get('host')||''))notFound();
 const {books,reports}=await loadLocalSourceReview(actor),query=await searchParams;
 const selected=reports.find(r=>r.id===(query.position??'POS-006'));if(!selected)notFound();
 const book=books.find(b=>b.filename===query.book),tab=book?.tabs.find(t=>t.name===query.tab);
 const profile=books.flatMap(b=>b.tabs.filter(t=>t.name==='profile_summary').flatMap(t=>t.rows)).filter(r=>r.line!=='Next payment');
 return <><h1>Private source review</h1><p>Local administrator only · 4 source workbooks · 40 tabs · No database import or access grants.</p><details><summary>Choose one of {reports.length} source positions</summary><ul>{reports.map(r=><li key={r.id}><Link href={`?position=${r.id}`}>{r.position_name} · {r.holder_name} · {r.project_name}</Link></li>)}</ul></details><nav aria-label="Scott review"><Link href="?position=POS-006">Scott · Norden loan</Link> · <Link href="?position=POS-101">Scott · Sutter loan</Link> · <Link href="?position=POS-102">Scott · Reserve</Link> · <Link href="?position=POS-001">Norden equity example</Link></nav><InvestorReportView report={selected} preview/>
 {['POS-006','POS-101','POS-102'].includes(selected.id)&&<section><h2>Scott’s source profile snapshot</h2><p>Draft, unaudited · October 16, 2026. These overlapping summary measures must not be added together. The source next-payment claim is withheld pending schedule reconciliation.</p><table><tbody>{profile.map((r,i)=><tr key={i}><th>{r.line}</th><td>{reportAmount(sourceMoney(r.amount),'USD')}</td></tr>)}</tbody></table></section>}
 <section><h2>Original extracted source rows</h2><p>Source roles, formulas and notes below are evidence for review, not executed instructions or access grants.</p>{books.map(b=><details key={b.filename}><summary>{b.filename}</summary><ul>{b.tabs.map(t=><li key={t.name}><Link href={`?position=${selected.id}&book=${encodeURIComponent(b.filename)}&tab=${encodeURIComponent(t.name)}#source-table`}>{t.name} ({t.rows.length} rows)</Link></li>)}</ul></details>)}{tab&&<div id="source-table" style={{overflowX:'auto'}}><h3>{tab.name}</h3><table><thead><tr>{Object.keys(tab.rows[0]??{}).map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{tab.rows.map((r,i)=><tr key={i}>{Object.keys(tab.rows[0]??{}).map(k=><td key={k}>{r[k]??'Not supplied'}</td>)}</tr>)}</tbody></table></div>}</section></>;
}
