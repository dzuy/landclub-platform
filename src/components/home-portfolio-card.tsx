import Link from 'next/link';
import {reportAmount,type InvestorReport} from '@/lib/investor-reports';
import styles from './member-home.module.css';
import s from './home-portfolio-card.module.css';

function date(value:string|null){return value?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${value.slice(0,10)}T00:00:00Z`)):null;}
export function HomePortfolioCard({report}:{report:InvestorReport}){
 const position=report.lines.filter(l=>l.section==='position');
 const find=(...labels:string[])=>{for(const label of labels){const line=position.find(l=>l.label===label);if(line)return line.amount;}return null;};
 const amount=(value:string|null)=>value===null?'Pending':reportAmount(value,report.currency).replace(/^USD /,'$').replace(/\.00$/,'');
 const transactions=report.lines.filter(l=>l.section==='transactions');
 const funding=transactions.filter(l=>/ · (capital contribution|loan funding|reserve deposit) · /.test(l.label));
 const repayments=transactions.filter(l=>l.label.includes(' · return of capital · '));
 const fundingDate=funding.length===1?date(funding[0].effective_date):null;
 const returnedDate=repayments.length===1?date(repayments[0].effective_date):null;
 const remaining=find('capital outstanding','principal outstanding','principal or deposits');
 const kind=report.kind==='equity'?'Equity':report.kind==='reserve'?'Reserve':report.kind==='loan'?'Loan':report.kind.replaceAll('_',' ');
 const project=report.project_name.replace(/^Land Club /,'').replace(/ LLC$/,'');
 const rows=[
  [`Original investment${fundingDate?` · ${fundingDate}`:''}`,amount(find('capital contributed','principal','amount','commitment amount'))],
  [`Principal returned${returnedDate?` · ${returnedDate}`:''}`,amount(find('capital returned'))],
  ['Remaining principal',amount(remaining)],
  ['Preferred return accrued to date',report.kind==='equity'?amount(find('pref accrued to date','pref unpaid')):'Not applicable'],
 ];
 return <section className={`${styles.card} ${s.card}`} aria-labelledby={`home-portfolio-${report.id}`}>
  <div className={s.header}><h2 id={`home-portfolio-${report.id}`}>Your investments</h2><span className={s.chip}>{kind}</span></div>
  <div><p className={s.amount}>{amount(remaining)}</p><p className={s.caption}>{project} · {kind} · remaining principal</p></div>
  <dl className={s.rows}>{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  <Link className={`${styles.button} ${s.button}`} href={`/dashboard/portfolio#position-${report.id}`}>See more</Link>
 </section>;
}
