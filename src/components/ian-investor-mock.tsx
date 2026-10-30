import Link from 'next/link';
import {IanStatementModals} from './ian-statement-modals';
import type {ReactNode} from 'react';
import s from './ian-investor-mock.module.css';
const assets='/images/investor-mock/';
function Card({title,children}:{title:string;children:ReactNode}){return <section className={s.card}><h2>{title}</h2>{children}</section>}
function Rows({rows}:{rows:[ReactNode,ReactNode][]}){return <dl className={s.rows}>{rows.map(([label,value],i)=><div key={i}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
function Note({children}:{children:ReactNode}){return <p className={s.note}>{children}</p>}
function Dot({name}:{name:string}){return <img className={s.dot} src={`${assets}${name}.svg`} alt=""/>}
export function IanPortfolioMock(){return <div className={s.portfolio} data-investor-mock>
 <nav className={s.breadcrumb} aria-label="Breadcrumb"><Link href="/dashboard"><img src={`${assets}back.svg`} alt=""/> Dashboard</Link><span>/</span><span>Your investments</span></nav>
 <div className={s.heading}><h1>Your investments</h1><span className={s.mock}>Ian · Figma mock data</span></div>
 <img className={s.hero} src={`${assets}norden-cross.png`} alt="Skiers on a snow-covered forest trail at Norden Cross"/>
 <section className={s.card}><div className={s.heading}><h2>Land Club Norden Cross LLC</h2><span className={s.chip}>Equity</span></div>
 <Note><strong>Member, Ownership Interest.</strong> Funded May 2, 2025. Figures as of Oct 16, 2026.</Note>
 <div className={s.metrics}>{[['$150,000','Remaining principal'],['$250,000','Original investment'],['$100,000','Principal returned'],['$32,328','Preferred return accrued']].map(([value,label])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
 <Rows rows={[
 ['Invested through','Brooklyn Kenny Revocable Living Trust (Ian Kenny and Khobi Brooklyn, Trustees)'],
 ['Preferred return','10% a year, simple, on unreturned principal'],['Profit split','70% investors / 30% Land Club, after the preferred return'],['Your profit share',"42% (60% of the investors’ 70%), after the preferred return"],['Funded','May 2, 2025'],['Principal returned','$100,000 on May 19, 2026'],['Remaining principal','$150,000']]}/>
 <Link className={s.primary} href="/dashboard/portfolio/reports">Company reports: cash, balance sheet, quarterly updates →</Link>
 </section>
 <div className={s.grid}>
 <Card title="How Norden Cross is financed"><div className={s.shares}><div><strong>60%</strong><Note><b>Of the investor equity</b> ($150,000 of $250,000). This is your share of investor profits after the preferred return.</Note></div><div><strong>15%</strong><Note><b>Of the total capital stack</b> ($150,000 of $1,000,000, including the $750,000 loan, which is paid first).</Note></div></div><div className={s.stack} aria-label="Capital stack: 75% loan, 15% your equity, 10% other investors"><span/><span/><span/></div>
 <Rows rows={[[<><Dot name="loan"/>First deed of trust loan<Note>10% interest. Paid ahead of all equity, including your capital and preferred return.</Note></>,'$750,000'],[<><Dot name="equity"/>Your equity</>,'$150,000'],[<><Dot name="other"/>Other investors</>,'$100,000'],['Total capitalization','$1,000,000']]}/></Card>
 <Card title="Your position"><Rows rows={[["Contributed","$250,000.00"],["Principal returned","−$100,000.00"],["Remaining capital","$150,000.00"],["Preferred return accrued, unpaid","$32,328.76"],[<strong>Paid to you first, before any profit split</strong>,<strong>$182,328.76</strong>]]}/><Note>Paid from sale or refinance proceeds: your remaining capital first, then accrued preferred return, then the 70/30 split. Not guaranteed.</Note></Card>
 <Card title="How your preferred return is calculated"><Rows rows={[[<>May 2, 2025 to May 19, 2026<Note>$250,000 × 10% × 382/365 days</Note></>,'$26,164.38'],[<>May 19, 2026 to Oct 16, 2026<Note>$150,000 × 10% × 150/365 days</Note></>,'$6,164.38'],['Accrued to date','$32,328.76']]}/><Note>Accrues at <strong>about $41 a day</strong> on the remaining $150,000. Paid before any profit split.</Note><Note>Accrued, not yet paid. Paid only from sale or refinance proceeds, after the loan and the return of your capital. Not guaranteed.</Note></Card>
 <Card title="Activity"><Rows rows={[[<>Preferred return accrued to date<Note>Oct 16, 2026</Note></>,'$32,328.76'],[<>Principal returned<Note>May 19, 2026</Note></>,'$100,000'],[<>Preferred return accrued on $250,000<Note>May 19, 2026</Note></>,'$26,164.38'],[<>Investment funded<Note>May 2, 2025</Note></>,'$250,000']]}/></Card>
 </div>
 <Card title="Statements and documents"><IanStatementModals/></Card>
 </div>}
export function IanReportsMock(){return <div className={`${s.portfolio} ${s.reports}`} data-investor-mock>
 <Link className={s.breadcrumb} href="/dashboard/portfolio">◀ Your investment</Link><img className={s.hero} src={`${assets}norden-cross.png`} alt="Skiers on a snow-covered forest trail at Norden Cross"/><div className={s.heading}><h1>Reports</h1><span className={s.mock}>Ian · Figma mock data</span></div>
 <p className={s.banner}>DRAFT. Figures are Land Club’s best estimate as of October 16, 2026 (unaudited). Narrative and images are placeholders.</p>
 <div className={s.grid}><Card title="Cash on hand"><strong className={s.cash}>$65,672</strong><Note>As of October 16, 2026</Note><Rows rows={[["Last report (April 13, 2026)","$803"],["Change since last report","+$64,869"],["Monthly spend, average since April 1","$22,800"]]}/></Card>
 <Card title="Balance sheet"><Note>Land Club Norden Cross LLC · As of October 16, 2026</Note><Rows rows={[[<strong>Assets</strong>,''],['Cash','$65,672'],['Land, Norden (19 acres, incl. acquisition costs)','$792,877'],['Prepaid loan interest','$5,856'],[<strong>Total assets</strong>,<strong>$864,405</strong>],[<strong>Liabilities</strong>,''],['First mortgage loans (May 2026 refi)','$750,000'],['Payables and other','$17,550'],[<strong>Total liabilities</strong>,<strong>$767,550</strong>],[<strong>Members’ equity</strong>,<strong>$96,855</strong>]]}/></Card></div>
 <Card title="Spending summary"><Note>Cash paid April 1 – October 16, 2026, including $22,021 interest paid at the May refinance.</Note><div className={s.tableWrap}><table><thead><tr><th>Category</th><th>Apr 1 – Oct 16</th><th>Share</th></tr></thead><tbody>{[['Land carry (loan interest, property taxes)','$69,126','46.6%'],['Design and permitting','$35,627','24.0%'],['Legal, accounting and admin','$4,438','3.0%'],['Manager fees (Land Club LLC)','$28,905','19.5%'],['Marketing, brand and web','$10,085','6.8%']].map(row=><tr key={row[0]}>{row.map(cell=><td key={cell}>{cell}</td>)}</tr>)}</tbody><tfoot><tr><th>Total</th><th>$148,181</th><th>100%</th></tr></tfoot></table></div></Card>
 <div className={s.grid}><Card title="Project progress">{[['done','Property acquired','Done · May 2025'],['done','Site survey and feasibility','Done · Sep 2025'],['progress','Cabin design and permitting','In progress · Target Q1 2027'],['next','Construction financing','Next · Target Q2 2027'],['next','First two cabins built','Next · Target 2028']].map(([dot,title,status])=><div className={s.step} key={title}><Dot name={dot}/><div><strong>{title}</strong><Note>{status}</Note></div></div>)}</Card>
 <Card title="Quarterly updates"><Note>Sent within 30 days of each quarter end.</Note>{[['Q3 2026 update · New','Oct 2026'],['Q2 2026 update','Jul 2026'],['Q1 2026 update','Apr 2026'],['Q4 2025 update','Jan 2026'],['Q3 2025 update','Oct 2025']].map(([title,date])=><Link className={`${s.update} ${s.updateLink}`} href="/dashboard/portfolio/reports/q3-2026" key={title}><strong>{title}</strong><span>{date}　 View</span></Link>)}</Card></div>
 </div>}
