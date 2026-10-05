import {PageHeading} from '@/components/page-heading';
import Link from 'next/link';
import type {MemberPropertyDetail} from '@/lib/member-property-access';
import {propertyRoleLabels} from '@/lib/member-properties';
import type {ClubEvent} from '@/lib/events';
import styles from './member-home.module.css';
import {homePropertyPhoto} from '@/lib/member-home';

export function MemberHome({name,properties,events}:{name:string;properties:MemberPropertyDetail[];events:ClubEvent[]}){
 const firstName=name&&!name.includes('@')?name.trim().split(/\s+/)[0]:'';
 return <div className={styles.home}>
  <PageHeading title="Home" description={firstName?`Welcome back, ${firstName}.`:'Welcome back.'}/>
  <div className={styles.layout}><section aria-labelledby="home-properties"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>PLACES YOU’RE CONNECTED TO</span><h2 id="home-properties">Your properties <span className={styles.count}>{properties.length}</span></h2></div><Link href="/staff/my-properties">View all <span aria-hidden="true">↗</span></Link></div>
   {properties.length?<div className={styles.properties}>{properties.map(({id,roles,property:p})=>{const photo=homePropertyPhoto(p);return <Link href={`/staff/my-properties/${id}`} className={styles.property} key={id}>
    <div className={styles.image}>{photo?<img src={photo.src} alt={photo.alt}/>:<div className={styles.noImage}><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><path d="m4 35 14-22 10 15 7-10 9 17M4 40h40"/><circle cx="33" cy="9" r="3"/></svg><span>{p.region||'Location to be confirmed'}</span></div>}<span className={styles.open} aria-hidden="true">↗</span></div>
    <div className={styles.propertyBody}><p className={styles.location}>{p.region||'Location to be confirmed'}</p><h3>{p.name||'Untitled property'}</h3><div className={styles.roles}>{roles.map(role=><span key={role}>{propertyRoleLabels[role]}</span>)}</div></div>
   </Link>;})}</div>:<div className={styles.empty}><h3>Your connection starts here.</h3><p>Properties linked to your membership will appear here.</p><Link href="/">Explore properties <span aria-hidden="true">↗</span></Link></div>}
   <section className={styles.stays} aria-labelledby="home-stays"><div className={styles.stayIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 15h3"/></svg></div><div><h3 id="home-stays">Make time for your places.</h3><p>Online booking isn’t available yet. Explore your property details while we get stays ready.</p></div><Link href="/staff/my-properties">My properties <span aria-hidden="true">→</span></Link></section>
  </section>
  <aside className={styles.side}><section aria-labelledby="home-events"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>ON THE CALENDAR</span><h2 id="home-events">Coming together</h2></div></div>
   {events.length?<div className={styles.events}>{events.map(({id,details:d})=>{const date=new Date(d.startsAt);const format=(options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-US',{...options,timeZone:d.timeZone}).format(date);return <Link className={styles.event} href={`/staff/events#event-${id}`} key={id}><div className={styles.date}><span>{format({month:'short'})}</span><strong>{format({day:'numeric'})}</strong></div><div><h3>{d.title}</h3><p><time dateTime={d.startsAt}>{format({weekday:'short',hour:'numeric',minute:'2-digit',timeZoneName:'short'})}</time></p><p>{d.location}</p><span className={styles.eventLink}>View event <span aria-hidden="true">↗</span></span></div></Link>;})}</div>:<div className={styles.eventEmpty}><h3>A little room on the calendar.</h3><p>No upcoming events right now. New club gatherings will appear here.</p></div>}
   <Link className={styles.allEvents} href="/staff/events">All club events <span aria-hidden="true">→</span></Link>
  </section><section className={styles.account}><span className={styles.eyebrow}>YOUR MEMBERSHIP</span><Link href="/staff/profile"><span>Profile & preferences</span><span aria-hidden="true">↗</span></Link><p>Keep your details up to date.</p></section></aside></div>
 </div>;
}
