import {DocumentLink} from './document-link';
import Link from 'next/link';
import {reportAmount,type InvestorReport,type ReportLine} from '@/lib/investor-reports';
import styles from './investor-report.module.css';
function Lines({title,lines,currency}:{title:string;lines:ReportLine[];currency:string}){
 return <section><h2>{title}</h2>{lines.length?<div className={styles.tableWrap}><table><thead><tr><th>Item</th><th>Amount</th><th>Basis / source</th></tr></thead><tbody>{lines.map(l=><tr key={l.id}><td>{l.label}{l.effective_date&&<small>{l.effective_date}</small>}</td><td>{reportAmount(l.amount,currency)}</td><td>{l.basis}<small>{l.source_reference}</small></td></tr>)}</tbody></table></div>:<p className={styles.empty}>Not supplied. No amount has been assumed.</p>}</section>;
}
export function InvestorReportView({report:r,preview=false}:{report:InvestorReport;preview?:boolean}){
 return <article className={styles.report}>
  <div><Link href="/dashboard/reports">‹ Reports</Link><p className={styles.banner}>{preview?'LOCAL PREVIEW · ':''}{r.review_state==='draft'?'DRAFT':'REVIEWED'} · Unaudited. {r.as_of?`Source figures as of ${r.as_of}.`:'Reporting date not supplied.'} Projections are not payments or guaranteed balances.{!r.released_at?' Not released to investors.':''}</p></div>
  <nav className={styles.tabs} aria-label="Report sections"><a href="#financials">Financials</a><a href="#schedule">Schedule</a><a href="#statements">Statements</a></nav>
  <header><p className={styles.meta}>{r.project_name} · {r.holder_name} · {r.kind}</p><h1>{r.title}</h1><p>{r.position_name}</p>{r.narrative&&<p>{r.narrative}</p>}<small>Source: {r.source_reference}</small></header>
  <section id="financials"><h2>Summary</h2><div className={styles.stats}>{r.lines.filter(l=>l.section==='summary').map(l=><div key={l.id}><strong>{reportAmount(l.amount,r.currency)}</strong><p>{l.label}</p><small>{l.basis} · {l.source_reference}</small></div>)}</div>{!r.lines.some(l=>l.section==='summary')&&<p className={styles.empty}>Summary figures not supplied.</p>}</section>
  <Lines title="Spending by category" lines={r.lines.filter(l=>l.section==='spending')} currency={r.currency}/>
  <Lines title="Your position" lines={r.lines.filter(l=>l.section==='position')} currency={r.currency}/>
  <Lines title="Transactions and projections" lines={r.lines.filter(l=>l.section==='transactions')} currency={r.currency}/>
  <section id="schedule"><h2>Payment schedules</h2>{r.schedules.some(s=>s.confirmation==='pending')&&<p className={styles.banner}>Pending confirmation. Source schedules are shown separately; a definitive next-payment date is not available.</p>}{r.schedules.length?<div className={styles.tableWrap}><table><thead><tr><th>Source / payment</th><th>Source date</th><th>Status</th></tr></thead><tbody>{r.schedules.map(s=><tr key={s.id}><td>{s.label}<small>{s.source_reference}</small></td><td>{s.scheduled_date??'Not supplied'}</td><td>{s.confirmation}<small>{s.note}</small></td></tr>)}</tbody></table></div>:<p className={styles.empty}>Schedule not supplied.</p>}</section>
  {r.findings.length>0&&<section><h2>Reconciliation</h2>{r.findings.map(f=><div className={styles.finding} key={f.id}><strong>{f.status==='pending'?'Pending confirmation':'Resolved'} · {f.description}</strong><p>Source value: {f.source_value??'Not supplied'}<br/>Review comparison: {f.comparison_value??'Not supplied'}</p><small>{f.source_reference} · Comparisons do not replace source values.{f.resolution&&` Resolution: ${f.resolution}`}</small></div>)}</section>}
  <section id="statements"><h2>Statements and documents</h2>{r.documents.length?<ul>{r.documents.map(d=><li key={d.id}><DocumentLink href={`/api/investor-report-documents/${d.id}`} filename={d.filename}/></li>)}</ul>:<p className={styles.empty}>Investor documents are pending.</p>}{!preview&&<a className="button secondary" href={`/api/investor-reports/${r.id}?download=csv`}>Download report data (CSV)</a>}</section>
 </article>;
}
