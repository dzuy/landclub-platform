import Link from 'next/link';
import {HomePortfolioCard} from './home-portfolio-card';
import type {InvestorReport} from '@/lib/investor-reports';
import {SortablePropertyGrid} from './sortable-property-grid';
import type {MemberPropertyDetail} from '@/lib/member-property-access';
import type {ClubEvent} from '@/lib/events';
import styles from './member-home.module.css';

export function MemberHome({name,properties,events,reports=[],memberId}:{memberId:string;name:string;properties:MemberPropertyDetail[];events:ClubEvent[];reports?:InvestorReport[]}){
 const following=properties.filter(p=>p.following);
 const firstName=name&&!name.includes('@')?name.trim().split(/\s+/)[0]:'';
 return <div className={styles.home} data-dashboard-home>
  <h1>{firstName?`Welcome back, ${firstName}`:'Welcome back'}</h1>
  <SortablePropertyGrid key={memberId} properties={properties}>
   {!properties.length&&<section className={styles.card} aria-labelledby="home-properties"><h2 id="home-properties">Your properties</h2><div className={styles.empty}><p>Properties linked to your membership will appear here.</p><Link className={styles.textLink} href="/properties">Explore properties →</Link></div></section>}
   {reports.length?reports.map(report=><HomePortfolioCard key={report.id} report={report}/>):<section className={styles.card} aria-labelledby="home-portfolio"><h2 id="home-portfolio">Your investments</h2><p className={styles.pending}>You don’t have any investments yet. Your investments and related documents will appear here.</p></section>}
  </SortablePropertyGrid>
  <section className={styles.card} aria-labelledby="home-following">
   <h2 id="home-following">Properties You’re Following</h2>
   <div className={styles.followingEmpty}>{following.length?<ul>{following.map(({id,property})=><li key={id}><Link className={styles.textLink} href={`/dashboard/my-properties/${id}`}>{property.name}</Link></li>)}</ul>:<p>Follow a property to keep it in your list.</p>}<Link className={styles.textLink} href="/dashboard/my-properties">Explore your properties →</Link></div>
  </section>
  <section aria-labelledby="home-membership" className={styles.membership}>
   <h2 id="home-membership">Your Membership</h2>
   <div className={styles.overview}>
    <section className={styles.card} aria-labelledby="home-events"><h3 id="home-events">Your events</h3>
     {events.length?events.map(({id,details:d})=>{const date=new Date(d.startsAt);const format=(options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-US',{...options,timeZone:d.timeZone}).format(date);return <Link className={styles.event} href={`/dashboard/events/${id}`} key={id}><time className={styles.date} dateTime={d.startsAt}><span>{format({month:'short'})}</span><strong>{format({day:'numeric'})}</strong></time><div><h4>{d.title}</h4><p>{d.location}</p></div><span className={styles.chip}>View event</span></Link>;}):<p className={styles.membershipEmpty}>No upcoming club events right now.</p>}
     <Link className={styles.textLink} href="/dashboard/events">All club events →</Link>
    </section>
    <section className={styles.card} aria-labelledby="home-bookings"><h3 id="home-bookings">Your bookings</h3><p className={styles.membershipEmpty}>Online booking isn’t available yet. Your upcoming stays will appear here.</p><Link className={styles.textLink} href="/dashboard/bookings">View bookings →</Link></section>
   </div>
  </section>
 </div>;
}
