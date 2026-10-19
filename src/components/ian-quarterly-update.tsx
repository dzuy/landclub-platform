import Link from 'next/link';
import s from './ian-quarterly-update.module.css';
const base='/dashboard/portfolio/reports/q3-2026';
const asset=(name:string)=>`/images/investor-mock/${name}.png`;
const cards=[
 ['Design','Done this quarter','Schematic design is complete for the first three cabins and the shared lodge. The architects moved the cabins 40 feet east to keep the stand of red fir by the creek.','imgPhoto2'],
 ['Permitting','Started','The permit package goes to Placer County in October. We expect the first round of comments in about 8 weeks.','imgPhoto3'],
 ['Construction','No update this quarter','Construction starts after permits are issued.',''],
 ['Capital','On track','In May we refinanced the land with a $750,000 first loan from three private lenders, including the seller, and returned $100,000 of capital. No new equity raised.',''],
 ['Marketing','In progress','New Norden Cross logo and the first set of site photography. Tell us what you think of the logo drafts.','imgPhoto4'],
 ['Events','Next up','Cocktails and Trails at Norden Cross is planned for next summer. Investors get first invitations.','imgPhoto5'],
];
const captions=['Sept 12 · Walking the cabin sites','Sept 12 · Creek crossing','Aug 22 · Architects on site','Aug 22 · Survey stakes','Aug 3 · Logo drafts','July 18 · Early morning, east meadow','July 18 · Video: site walk (2:40)','July 2 · Road in after the thaw'];
function DataTable({headers,rows}:{headers:string[];rows:string[][]}){return <div className={s.tableWrap}><table><thead><tr>{headers.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={row[0]} className={i===rows.length-1?s.total:undefined}>{row.map((cell,j)=>j===0?<th scope="row" key={j}>{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}
export function IanQuarterlyUpdate({financials=false}:{financials?:boolean}){return <article className={s.page} data-investor-mock>
 <div className={s.top}><Link href="/dashboard/portfolio/reports">◂ Reports</Link><p className={s.banner}>DRAFT. Figures are Land Club’s best estimate as of October 16, 2026 (unaudited). Narrative and images are placeholders.</p></div>
 <nav className={s.tabs} aria-label="Quarterly update sections"><Link href={base} aria-current={!financials?'page':undefined}>Update</Link><Link href={`${base}/financials`} aria-current={financials?'page':undefined}>Financials</Link></nav>
 <header className={s.hero}>{!financials&&<img src={asset('imgHeroSiteVisit')} alt="Mock site visit: skiers on a snowy forest trail"/>}<p className={s.meta}>Update · April 1 to October 16, 2026 · Sent October 16, 2026</p><h1>Design is done. Permitting starts.</h1><p>{financials?'Cash, spending and your position as of October 16, 2026.':"We spent the quarter finishing schematic design for the first cabins, walking the site with the architects twice, and preparing the permit package for Placer County. Here's what happened, with pictures."}</p></header>
 {financials?<>
 <section><h2>Summary</h2><div className={s.stats}>{[['$65,672','Cash on hand, Oct 16'],['$148,181','Spent Apr 1 – Oct 16'],['$100,000','Capital returned to you, May 2026'],['$32,329','Your preferred return accrued']].map(([value,label])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></section>
 <section><h2>Spending by category</h2><DataTable headers={['Category','Apr 1 – Oct 16','Share']} rows={[
 ['Architecture and design','$28,500','19.2%'],['Engineering, consulting and project mgmt','$7,127','4.8%'],['Loan interest and property taxes','$69,126','46.6%'],['Manager fees (Land Club LLC)','$28,905','19.5%'],['Marketing, brand and web','$10,085','6.8%'],['Legal, accounting and admin','$4,438','3.0%'],['Total','$148,181','100%']]}/></section>
 <section><h2>Your position</h2><DataTable headers={['Item','Amount']} rows={[
 ['Contributed','$250,000'],['Principal returned','$100,000'],['Remaining capital','$150,000'],['Preferred return accrued, unpaid','$32,328.76'],['Paid to you first, before any profit split','$182,328.76']]}/></section>
 </>:<>
 <section><h2>Then and now</h2><div className={s.two}>{[['imgPhoto','The site, May 2025'],['imgPhoto1','Latest cabin render, September 2026']].map(([photo,caption])=><figure className={s.comparison} key={photo}><img src={asset(photo)} alt={`Placeholder: ${caption}`}/><figcaption>{caption}</figcaption></figure>)}</div></section>
 <section><h2>Where things stand</h2><div className={s.two}>{cards.map(([title,status,copy,photo])=><section className={s.card} key={title}>{photo&&<img src={asset(photo)} alt={`${title} placeholder photograph`}/>}<h3>{title}</h3><strong>{status}</strong><p className={!photo?s.muted:undefined}>{copy}</p></section>)}</div></section>
 <section><h2>From the site</h2><div className={s.gallery}>{captions.map((caption,i)=><figure key={caption}><img src={asset(`imgPhoto${i+6}`)} alt={`Placeholder: ${caption}`}/><figcaption>{caption}</figcaption></figure>)}</div></section>
 </>}
 <div className={s.signoff}><p>Questions or thoughts on any of this, just reply. We'd like to hear from you.</p><strong>Nate Wieler, Manager, Land Club Norden Cross LLC</strong></div>
 {financials&&<Link className={s.bottomLink} href="/dashboard/portfolio/reports">Balance sheet and statements →</Link>}
 </article>}
