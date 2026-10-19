import Link from 'next/link';
import {photoThumbnailUrl} from '@/lib/photo-thumbnail-url';
import type {MemberPropertyDetail} from '@/lib/member-property-access';
import type {ClubEvent} from '@/lib/events';
import {homePropertyPhoto} from '@/lib/member-home';
import styles from './member-home.module.css';

export function MemberHome({name,properties,events}:{name:string;properties:MemberPropertyDetail[];events:ClubEvent[]}){
 const firstName=name&&!name.includes('@')?name.trim().split(/\s+/)[0]:'';
 return <div className={styles.home} data-dashboard-home>
  <h1>{firstName?`Welcome back, ${firstName}`:'Welcome back'}</h1>
  <div className={styles.overview}>
   <section className={styles.card} aria-labelledby="home-properties">
    <h2 id="home-properties">Your properties</h2>
    {properties.length?properties.slice(0,1).map(({id,property:p})=>{const photo=homePropertyPhoto(p);return <Link href={`/dashboard/my-properties/${id}`} className={styles.property} key={id}>
     {photo?<img className={styles.propertyImage} src={photoThumbnailUrl(photo.src)} decoding="async" alt={photo.alt}/>:<div className={styles.noImage}>Property photography coming soon</div>}
     <h3>{p.name||'Untitled property'}</h3><p>{p.region||'Location to be confirmed'}</p><span className={styles.textLink}>View property →</span>
    </Link>;}):<div className={styles.empty}><p>Properties linked to your membership will appear here.</p><Link className={styles.textLink} href="/properties">Explore properties →</Link></div>}
    {properties.length>1&&<Link className={styles.allProperties} href="/dashboard/my-properties">View all {properties.length} properties →</Link>}
   </section>
   <section className={styles.card} aria-labelledby="home-portfolio">
    <h2 id="home-portfolio">Your portfolio</h2>
    <p className={styles.balance} aria-label="Balance not yet available">—</p>
    <p className={styles.caption}>Your investment summary</p>
    <dl className={styles.balances}>{['Original investment','Principal returned','Remaining principal','Preferred return accrued to date'].map(label=><div key={label}><dt>{label}</dt><dd aria-label="Not yet available">—</dd></div>)}</dl>
    <p className={styles.pending}>Portfolio details are coming soon.</p>
    <Link className={styles.button} href="/dashboard/portfolio">See more</Link>
   </section>
  </div>
  <section className={styles.card} aria-labelledby="home-following">
   <h2 id="home-following">Properties You’re Following</h2>
   <div className={styles.followingEmpty}><p>Property following is coming soon. Explore the places taking shape at Land Club.</p><Link className={styles.textLink} href="/properties">Browse properties →</Link></div>
  </section>
  <section aria-labelledby="home-membership" className={styles.membership}>
   <h2 id="home-membership">Your Membership</h2>
   <div className={styles.overview}>
    <section className={styles.card} aria-labelledby="home-events"><h3 id="home-events">Your events</h3>
     {events.length?events.map(({id,details:d})=>{const date=new Date(d.startsAt);const format=(options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-US',{...options,timeZone:d.timeZone}).format(date);return <Link className={styles.event} href={`/dashboard/events#event-${id}`} key={id}><time className={styles.date} dateTime={d.startsAt}><span>{format({month:'short'})}</span><strong>{format({day:'numeric'})}</strong></time><div><h4>{d.title}</h4><p>{d.location}</p></div><span className={styles.chip}>View event</span></Link>;}):<p className={styles.membershipEmpty}>No upcoming club events right now.</p>}
     <Link className={styles.textLink} href="/dashboard/events">All club events →</Link>
    </section>
    <section className={styles.card} aria-labelledby="home-bookings"><h3 id="home-bookings">Your bookings</h3><p className={styles.membershipEmpty}>Online booking isn’t available yet. Your upcoming stays will appear here.</p><Link className={styles.textLink} href="/dashboard/bookings">View bookings →</Link></section>
   </div>
  </section>
 </div>;
}
