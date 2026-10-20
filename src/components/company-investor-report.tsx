import Link from 'next/link';
import type {ReactNode} from 'react';
import type {CompanyReport} from '@/lib/investor-company-report';
import {reportAmount} from '@/lib/investor-reports';
import s from './ian-investor-mock.module.css';
function Card({title,children}:{title:string;children:ReactNode}){return <section className={s.card}><h2>{title}</h2>{children}</section>}
function Rows({rows}:{rows:[ReactNode,ReactNode][]}){return <dl className={s.rows}>{rows.map(([label,value],i)=><div key={i}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
const money=(value:string)=>reportAmount(value,'USD').replace('USD ','$');
export function CompanyInvestorReport({report,back}:{report:CompanyReport;back:string}){return <div className={`${s.portfolio} ${s.reports}`}>
 <Link className={s.breadcrumb} href={back}>◀ Your investment</Link><img className={s.hero} src="/images/investor-mock/norden-cross.png" alt="Skiers on a snow-covered forest trail at Norden Cross"/>
 <div className={s.heading}><h1>Reports</h1><span className={s.mock}>Land Club Norden Cross LLC</span></div>
 <p className={s.banner}>DRAFT · Unaudited. Nathan’s company figures as of {report.asOf}.</p>
 <div className={s.grid}><Card title="Cash on hand"><strong className={s.cash}>{money(report.cash)}</strong><p className={s.note}>As of {report.asOf}</p><Rows rows={[[`Last report (${report.comparisonDate})`,money(report.previousCash)],['Change since last report',`${report.cashChange.startsWith('-')?'':'+'}${money(report.cashChange)}`],['Cash spending, Apr 1 – Oct 16',money(report.totalSpending)]]}/><p className={s.note}>Computed closing cash; bank confirmation pending.</p></Card>
 <Card title="Balance sheet"><p className={s.note}>Land Club Norden Cross LLC · As of {report.asOf}</p><Rows rows={[[<strong>Assets</strong>,''],...report.assets.map(v=>[v.label,money(v.amount)] as [ReactNode,ReactNode]),[<strong>Total assets</strong>,<strong>{money(report.totalAssets)}</strong>],[<strong>Liabilities</strong>,''],...report.liabilities.map(v=>[v.label,money(v.amount)] as [ReactNode,ReactNode]),[<strong>Total liabilities</strong>,<strong>{money(report.totalLiabilities)}</strong>],[<strong>Members’ equity</strong>,<strong>{money(report.equity)}</strong>],['Total liabilities and equity',money(report.totalLiabilitiesAndEquity)]]}/></Card></div>
 <Card title="Spending summary"><p className={s.note}>Cash paid April 1 – October 16, 2026, including interest paid at the May refinance.</p><div className={s.tableWrap}><table><thead><tr><th>Category</th><th>Apr 1 – Oct 16</th><th>Share</th></tr></thead><tbody>{report.spending.map(v=><tr key={v.label}><td>{v.label}</td><td>{money(v.amount)}</td><td>{v.share}%</td></tr>)}</tbody><tfoot><tr><th>Total</th><th>{money(report.totalSpending)}</th><th>100%</th></tr></tfoot></table></div></Card>
 <details className={s.card}><summary>About these figures</summary>{report.notes.map(n=><p className={s.note} key={n}>{n}</p>)}<p className={s.note}>Source: {report.source} · Balance Sheet, Spending 4-1 to 10-16. Financial figures retain the source’s cents.</p></details>
 <div className={s.grid}><Card title="Project progress"><p className={s.note}>A project progress update has not been supplied yet.</p></Card><Card title="Quarterly updates"><p className={s.note}>Quarterly updates will appear here when published.</p></Card></div>
 </div>;}
