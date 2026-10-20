import type {calculateTerms} from '@/lib/investment-terms';
import {PortfolioItemSwitcher} from './portfolio-item-switcher';
import Link from 'next/link';
import type {ReactNode} from 'react';
import type {InvestorReport,ReportLine} from '@/lib/investor-reports';
import {reportAmount} from '@/lib/investor-reports';
// Keep the original Portfolio design. Only its data source has changed.
import s from './ian-investor-mock.module.css';
const assets='/images/investor-mock/';
const labels:Record<string,string>={
 'capital contributed':'Original investment','capital returned':'Principal returned','capital outstanding':'Remaining principal',
 'pref accrued to date':'Preferred return accrued','pref paid to date':'Preferred return paid','pref unpaid':'Preferred return accrued, unpaid',
 'balance owed before profit split':'Reported balance before profit split','commitment amount':'Commitment',
 'principal':'Original loan','principal outstanding':'Remaining principal','principal or deposits':'Principal / deposits',
 'interest earned to date':'Interest earned','interest earned':'Interest earned','interest paid to date':'Interest paid','interest paid':'Interest paid',
 'interest accrued unpaid':'Interest accrued, unpaid','interest prepaid':'Prepaid interest','balance today':'Balance at report date',
 'amount':'Deposit','entitlement':'Entitlement','total scheduled all waves':'Scheduled distributions',
};
function Card({title,children}:{title:string;children:ReactNode}){return <section className={s.card}><h2>{title}</h2>{children}</section>}
function Rows({rows}:{rows:[ReactNode,ReactNode][]}){return <dl className={s.rows}>{rows.map(([label,value],i)=><div key={i}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
function Note({children}:{children:ReactNode}){return <p className={s.note}>{children}</p>}
function date(value:string|null){return value?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`)):'Date pending';}
function money(value:string|null,currency:string){return value===null?'Not yet available':reportAmount(value,currency).replace(/^USD /,'$');}
function activity(line:ReportLine){const raw=line.label.split(' · ')[1]??line.label;return ({'capital contribution':'Investment funded','return of capital':'Principal returned','loan funding':'Loan funded','interest payment':'Interest paid','loan payment':'Loan payment','reserve deposit':'Reserve deposit'} as Record<string,string>)[raw]??raw.charAt(0).toUpperCase()+raw.slice(1);}
export function RealInvestorPortfolio({name,reports,base='/dashboard/portfolio',downloadBase='/api/investor-reports',preview=false,statements=[],previewToken,accruals={}}:{accruals?:Record<string,ReturnType<typeof calculateTerms>|null>;name:string;reports:InvestorReport[];base?:string;downloadBase?:string;preview?:boolean;statements?:{id:string;report_id:string;edition:number}[];previewToken?:string}){
 return <div className={s.portfolio} data-investor-portfolio>
 <nav className={s.breadcrumb} aria-label="Breadcrumb"><Link href="/dashboard"><img src={`${assets}back.svg`} alt=""/> Dashboard</Link><span>/</span><span>Your portfolio</span></nav>
 <div className={s.heading}><h1>Your portfolio</h1>{name&&<span className={s.mock}>{name}</span>}</div>
 {!reports.length&&<Card title="Your investments"><Note>Your investment information will appear here when it is ready to share.</Note></Card>}
 <PortfolioItemSwitcher items={reports.map(r=>{
 const values=r.lines.filter(l=>l.section==='position'),find=(...names:string[])=>{for(const name of names){const line=values.find(l=>l.label===name);if(line)return line.amount;}return null;};
 const metrics:[string,string|null][]=r.kind==='equity'?[
 ['Remaining principal',find('capital outstanding')],['Original investment',find('capital contributed','commitment amount')],['Principal returned',find('capital returned')],['Preferred return accrued',find('pref accrued to date','pref unpaid')]
 ]:r.kind==='reserve'?[
 ['Deposits',find('principal or deposits','amount')],['Interest accrued',find('interest accrued unpaid')],['Interest paid',find('interest paid')],['Reported balance',find('balance today')]
 ]:[['Remaining principal',find('principal outstanding','principal or deposits')],['Original loan',find('principal')],['Interest paid',find('interest paid to date','interest paid')],['Interest accrued, unpaid',find('interest accrued unpaid')]];
 const transactions=r.lines.filter(l=>l.section==='transactions').sort((a,b)=>(b.effective_date??'').localeCompare(a.effective_date??''));
 const norden=r.project_name.includes('Norden Cross');
 return {id:r.id,label:r.kind==='reserve'?r.project_name:`${r.project_name.replace(/^Land Club /,'').replace(/ LLC$/,'')} · ${r.kind==='loan'?'Loan':'Equity'}`,content:<article id={`position-${r.id}`} className={s.investment} key={r.id}>
 {norden&&<img className={s.hero} src={`${assets}norden-cross.png`} alt="Skiers on a snow-covered forest trail at Norden Cross"/>}
 <section className={s.card}><div className={s.heading}><h2>{r.project_name}</h2><span className={s.chip}>{r.kind==='equity'?'Equity':r.kind==='reserve'?'Reserve':'Loan'}</span></div>
 <Note>Figures as of {date(r.as_of)}.{!r.released_at?' Draft · not yet shared with the investor.':' Unaudited.'}</Note>
 <div className={s.metrics}>{metrics.map(([label,value])=><div key={label}><strong>{money(value,r.currency)}</strong><span>{label}</span></div>)}</div>
 <Rows rows={[[r.kind==='equity'?'Invested through':'Account holder',r.holder_name]]}/>
 <a className={s.primary} href={`/dashboard/portfolio/reports/${r.id}${previewToken?`?preview=${previewToken}`:''}`}>Company reports and updates →</a>
 </section>
 <Card title="Calculated accrual">{accruals[r.id]?.available?<><Rows rows={Object.entries(accruals[r.id]!).filter(([key])=>['asOf','principal','accrued','paid','unpaid','prepaid'].includes(key)).map(([key,value])=>[key,String(value)])}/><Note>Confirmed simple Actual/365 loan terms. Accrued is not paid or currently payable. Source-dated figures above are preserved separately.</Note></>:<Note>{accruals[r.id]&&!accruals[r.id]!.available?(accruals[r.id] as {reason:string}).reason:'Pending confirmed terms and released calculation access.'}</Note>}</Card>
 <div className={s.grid}>
 <Card title="Your position"><Rows rows={values.filter(l=>!['commitment amount','amount'].includes(l.label)).map(l=>[labels[l.label]??l.label,money(l.amount,r.currency)])}/><Note>These are the reported figures at {date(r.as_of)}, not a live balance.</Note></Card>
 <Card title="Activity">{transactions.length?<Rows rows={transactions.map(l=>[<>{activity(l)}<Note>{date(l.effective_date)}{l.basis==='internal_transfer'?' · Transfer between your investments':''}{l.basis==='non_cash'?' · Non-cash':''}</Note></>,money(l.amount,r.currency)])}/>:<Note>No activity has been supplied for this position yet.</Note>}{transactions.length>0&&<Note>Activity is taken from the supplied records. Payment confirmation is still being reviewed.</Note>}</Card>
 <Card title={r.kind==='equity'?'Your preferred return':'Interest and payments'}><Rows rows={values.filter(l=>/^(pref |interest )/.test(l.label)).map(l=>[labels[l.label]??l.label,money(l.amount,r.currency)])}/><Note>{r.kind==='equity'?'The return rate, profit share and payout order are being checked against the agreement.':'The interest terms and payment dates are being checked against the agreement.'} Confirmed terms will appear here.</Note>{r.schedules.some(v=>v.confirmation==='confirmed')?<Rows rows={r.schedules.filter(v=>v.confirmation==='confirmed').map(v=>[v.label,date(v.scheduled_date)])}/>:r.kind!=='equity'&&<Note>Next payment: awaiting confirmation.</Note>}</Card>
 <section id={`reports-${r.id}`} className={s.card}><h2>Company reports and updates</h2>{norden?<><Note>Cash, balance sheet and spending from Nathan’s October 16 company report.</Note><Link className={s.primary} href={`/dashboard/portfolio/reports/${r.id}${previewToken?`?preview=${previewToken}`:''}`}>View company reports →</Link></>:<Note>A company financial report has not been supplied for this investment yet.</Note>}</section>
 </div>
 <Card title="Statements and documents">{r.documents.length===0&&statements.filter(v=>v.report_id===r.id).length===0&&<Note>Your statements and signed documents will appear here when available.</Note>}
 {r.documents.map(d=><p key={d.id}><a className={s.updateLink} href={preview?`${downloadBase}/${r.id}?document=${d.id}`:`/api/investor-report-documents/${d.id}`}>{d.filename}<span>Download →</span></a></p>)}
 {statements.filter(v=>v.report_id===r.id).map(v=><p key={v.id}><a href={`/api/investor-statements/${v.id}${previewToken?`?preview=${previewToken}`:''}`}>Statement data · edition {v.edition} (JSON)</a></p>)}
 <details className={s.document}><summary>Download investment data<span>CSV / JSON</span></summary><Note><a href={`${downloadBase}/${r.id}?download=csv`}>Download CSV</a> · <a href={`${downloadBase}/${r.id}?download=json`}>Download JSON</a></Note><Note>Data exports are not signed statements or tax documents.</Note></details>
 {preview&&<details className={s.document}><summary>Admin: data review notes<span>{r.findings.filter(f=>f.status==='pending').length} pending</span></summary>{r.findings.map(f=><Note key={f.id}>{f.description}{f.resolution&&<> Resolution: {f.resolution}</>}</Note>)}</details>}
 </Card>
 </article>};
 })}/></div>;
}
