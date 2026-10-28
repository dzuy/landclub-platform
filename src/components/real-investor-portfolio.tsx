import {DocumentLink} from './document-link';
import {PortfolioItemSwitcher} from './portfolio-item-switcher';
import Link from 'next/link';
import type {ReactNode,CSSProperties} from 'react';
import type {InvestorReport} from '@/lib/investor-reports';
import {reportAmount} from '@/lib/investor-reports';
import s from './ian-investor-mock.module.css';
import layout from './real-investor-portfolio.module.css';
const assets='/images/investor-mock/';
function Card({title,children}:{title:string;children:ReactNode}){return <section className={s.card}><h2>{title}</h2>{children}</section>}
function Rows({rows}:{rows:[ReactNode,ReactNode][]}){return <dl className={s.rows}>{rows.map(([label,value],i)=><div key={i}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
function Note({children}:{children:ReactNode}){return <p className={s.note}>{children}</p>}
function Pending(){return <span className={layout.pending}>Pending</span>}
function SourceValue({children}:{children?:ReactNode}){return children!=null?<>{children}</>:<Pending/>;}
function date(value:string|null){return value?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${value.slice(0,10)}T00:00:00Z`)):'Pending';}
function money(value:string|null,currency:string,compact=false){return value===null?'Pending':reportAmount(value,currency).replace(/^USD /,'$').replace(compact?/\.00$/:/$^/,'');}
export function RealInvestorPortfolio({reports,downloadBase='/api/investor-reports',preview=false,previewToken}:{name:string;reports:InvestorReport[];base?:string;downloadBase?:string;preview?:boolean;statements?:{id:string;report_id:string;edition:number}[];previewToken?:string}){
 return <div className={`${s.portfolio} ${layout.portfolio}`} data-investor-portfolio>
 <nav className={s.breadcrumb} aria-label="Breadcrumb"><Link href="/dashboard"><img src={`${assets}back.svg`} alt=""/> Dashboard</Link><span>/</span><span>Your portfolio</span></nav>
 <h1>Your portfolio</h1>
 {!reports.length&&<Card title="You don’t have any investments yet."><Note>Your investments and related documents will appear here.</Note></Card>}
 <PortfolioItemSwitcher items={reports.map(r=>{
 const values=r.lines.filter(l=>l.section==='position'),find=(...names:string[])=>{for(const name of names){const line=values.find(l=>l.label===name);if(line)return line.amount;}return null;};
 const equity=r.kind==='equity',e=r.portfolioEvidence;
 const remaining=find('capital outstanding','principal outstanding','principal or deposits');
 const original=find('capital contributed','principal','amount','commitment amount');
 const returned=find('capital returned');
 const accrued=equity?find('pref accrued to date','pref unpaid'):null;
 const transactions=r.lines.filter(l=>l.section==='transactions').sort((a,b)=>(b.effective_date??'').localeCompare(a.effective_date??''));
 const funded=transactions.filter(l=>/ · (capital contribution|loan funding|reserve deposit) · /.test(l.label)).at(-1);
 const repayment=transactions.find(l=>l.label.includes(' · return of capital · '));
 const project=r.project_name.replace(/^Land Club /,'').replace(/ LLC$/,'');
 const amount=(v:string|null,compact=false)=>money(v,r.currency,compact);
 const notApplicable=<span className={layout.pending}>Not applicable · {r.kind==='reserve'?'Reserve':'Loan'}</span>;
 const segments=e?.segments??[];
 const percent=(numerator:string|null,denominator:string|null)=>numerator!==null&&denominator!==null&&Number(denominator)>0?`${Number((Number(numerator)/Number(denominator)*100).toFixed(2))}%`:null;
 const metrics:[string,ReactNode][]=[['Remaining principal',amount(remaining,true)],['Original investment',amount(original,true)],['Principal returned',amount(returned,true)],['Preferred return accrued',equity?amount(accrued,true):notApplicable]];
 const activity: {label:string;date:string|null;amount:string|null;note?:string}[]=transactions.map(l=>({label:({'capital contribution':'Investment funded','return of capital':'Principal returned','loan funding':'Investment funded','reserve deposit':'Investment funded','interest payment':'Interest paid','loan payment':'Loan payment'} as Record<string,string>)[l.label.split(' · ')[1]]??'Investment funded',date:l.effective_date,amount:l.amount,note:l.basis==='internal_transfer'?'Internal transfer':l.basis==='non_cash'?'Non-cash':undefined}));
 if(equity&&accrued!==null)activity.push({label:'Preferred return accrued to date',date:r.as_of,amount:accrued});
 for(const segment of segments.slice(0,-1))activity.push({label:`Preferred return accrued on ${amount(segment.principal,true)}`,date:segment.to,amount:segment.interest});
 activity.sort((a,b)=>(b.date??'').localeCompare(a.date??''));
 const docRows:[string,RegExp][]=[['Capital account statement',/capital.?account|statement/i],['K-1',/k.?1/i],['Operating Agreement',/operating.?agreement/i],['Subscription Agreement',/subscription.?agreement/i]];
 return {id:r.id,label:`${project} · ${equity?'Equity':r.kind==='reserve'?'Reserve':'Loan'}`,content:<article className={s.investment} id={`position-${r.id}`} key={r.id}>
 {r.project_name.includes('Norden Cross')&&<img className={s.hero} src={`${assets}norden-cross.png`} alt="Skiers on a snow-covered forest trail at Norden Cross"/>}
 <section className={s.card}><div className={s.heading}><h2>{r.project_name}</h2><span className={s.chip}>{equity?'Equity':r.kind==='reserve'?'Reserve':'Loan'}</span></div>
 <Note>{equity&&<strong>Member, Ownership Interest. </strong>}Funded {date(funded?.effective_date??null)}. Figures as of {date(r.as_of)}. Draft · unaudited.</Note>
 <div className={`${s.metrics} ${layout.metrics}`}>{metrics.map(([label,value])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
 <Rows rows={[
 ['Invested through',r.holder_name],
 ['Preferred return',equity?<SourceValue>{e?.rate!=null?`${e.rate}% a year, simple, on unreturned principal`:undefined}</SourceValue>:notApplicable],
 ['Profit split',equity?<SourceValue>{e?.profitSplit??undefined}</SourceValue>:notApplicable],
 ['Your profit share',equity?<SourceValue>{e?.profitShare!=null?`${e.profitShare}% after preferred return and capital`:undefined}</SourceValue>:notApplicable],
 ['Funded',<SourceValue>{funded?date(funded.effective_date):undefined}</SourceValue>],
 ['Principal returned',<SourceValue>{returned!==null?`${amount(returned,true)}${repayment?.effective_date?` on ${date(repayment.effective_date)}`:''}`:undefined}</SourceValue>],
 ['Remaining principal',amount(remaining,true)]
 ]}/>
 <Link className={s.primary} href={`/dashboard/portfolio/reports/${r.id}${previewToken?`?preview=${previewToken}`:''}`}>Company reports: cash, balance sheet, quarterly updates →</Link>
 </section>
 <div className={`${s.grid} ${layout.grid}`}>
 <Card title={`How ${project} is financed`}>
 <div className={s.shares}><div><strong>{equity&&e?.ownership!=null?`${e.ownership}%`:'Pending'}</strong><Note>Of the investor equity{e?.equity&&remaining?` (${amount(remaining,true)} of ${amount(e.equity,true)}).`:'.'} {!equity&&'Not applicable to this holding.'}</Note></div>
 <div><strong>{equity?percent(remaining,e?.total??null)??'Pending':'Pending'}</strong><Note>Of the total capital stack{e?.total&&remaining?` (${amount(remaining,true)} of ${amount(e.total,true)}, including the ${amount(e.debt,true)} loan).`:'.'}</Note></div></div>
 {equity&&e?.total&&e.debt&&remaining&&e.otherEquity&&<div className={layout.stack} role="img" aria-label={`Capital stack: loan ${amount(e.debt)}, your equity ${amount(remaining)}, other investors ${amount(e.otherEquity)}.`}>{[e.debt,remaining,e.otherEquity].map((v,i)=><span key={i} style={{flex:Number(v)} as CSSProperties}/>)}</div>}
 <Rows rows={[
 [<><img className={s.dot} src={`${assets}loan.svg`} alt=""/>First deed of trust loan<Note>{e?.debtRate!=null?`${e.debtRate}% interest. Paid ahead of equity.`:'Rate and payment priority pending.'}</Note></>,amount(e?.debt??null,true)],
 [<><img className={s.dot} src={`${assets}equity.svg`} alt=""/>Your equity</>,equity?amount(remaining,true):notApplicable],
 [<><img className={s.dot} src={`${assets}other.svg`} alt=""/>Other investors</>,amount(e?.otherEquity??null,true)],
 ['Total capitalization',amount(e?.total??null,true)]
 ]}/></Card>
 <Card title="Your position"><Rows rows={[
 ['Contributed',amount(original)],['Principal returned',returned===null?<Pending/>:`−${amount(returned)}`],['Remaining capital',amount(remaining)],
 ['Preferred return accrued, unpaid',equity?amount(find('pref unpaid')):notApplicable],
 [<strong>Paid to you first, before any profit split</strong>,equity?amount(find('balance owed before profit split')):notApplicable]
 ]}/><Note>{equity?e?.waterfall??'Payment order pending. Not guaranteed.':'Equity payout order does not apply to this holding.'}</Note></Card>
 <Card title="How your preferred return is calculated">
 {equity?<>{segments.length?<Rows rows={segments.map(v=>[<>{date(v.from)} to {date(v.to)}<Note>{amount(v.principal,true)} × {e?.rate}% × {v.days}/365 days</Note></>,amount(v.interest)])}/>:<Note><Pending/></Note>}<Rows rows={[[<strong>Accrued to date</strong>,amount(accrued)]]}/><Note>{e?.daily?`Accrues at about ${amount(e.daily)} a day on the remaining ${amount(remaining,true)}. `:''}Workbook calculation at {date(r.as_of)}.</Note><Note>Accrued, not yet paid. {e?.waterfall?'Paid from sale or refinance proceeds, after creditors/lenders and member loans.':'Payment timing and priority pending.'} Not guaranteed.</Note></>:<Note>Not applicable · This holding is {r.kind==='reserve'?'a Reserve account':'a loan'}, not equity with a preferred return.</Note>}
 </Card>
 <Card title="Activity">{activity.length?<Rows rows={activity.map(l=>[<>{l.label}<Note>{date(l.date)}{l.note&&<> · {l.note}</>}</Note></>,amount(l.amount,true)])}/>:<Pending/>}</Card>
 </div>
 <Card title="Statements and documents"><div className={layout.documents}>{docRows.map(([label,pattern])=>{
 const doc=r.documents.find(d=>pattern.test(d.filename));return <div key={label}>{doc?<DocumentLink href={preview?`${downloadBase}/${r.id}?document=${doc.id}`:`/api/investor-report-documents/${doc.id}`} filename={doc.filename}/>:<span>{label} · {label==='K-1'||label==='Operating Agreement'?r.project_name:project}</span>}<span>{doc?'Available':<Pending/>}</span></div>;
 })}</div></Card>
 </article>};
 })}/></div>;
}
