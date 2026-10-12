'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState} from 'react';

type IconName='home'|'properties'|'bookings'|'documents'|'events'|'profile'|'members'|'content';
const links:[string,string,IconName][]=[['Home','/dashboard','home'],['My Properties','/dashboard/my-properties','properties'],['Bookings','/dashboard/bookings','bookings'],['Documents','/dashboard/documents','documents'],['Events','/dashboard/events','events']];

function NavIcon({name}:{name:IconName}){
 const shapes={
  home:<><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7"/></>,
  properties:<><path d="M4 21V8l8-5 8 5v13"/><path d="M8 21v-6h8v6M8 10h.01M12 10h.01M16 10h.01"/></>,
  bookings:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 15l2 2 5-5"/></>,
  documents:<><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
  events:<><circle cx="8" cy="9" r="3"/><circle cx="17" cy="8" r="2"/><path d="M2.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M14 14c3.5 0 5.6 1.7 6 5"/></>,
  profile:<><circle cx="9" cy="8" r="4"/><path d="M2.5 21c.5-5 2.7-7.5 6.5-7.5 2.1 0 3.7.7 4.8 2"/><circle cx="18" cy="18" r="3"/><path d="M18 13.5v1.5M18 21v1.5M13.5 18H15M21 18h1.5"/></>,
  members:<><circle cx="8" cy="9" r="3"/><circle cx="17" cy="8" r="2"/><path d="M2.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M14 14c3.5 0 5.6 1.7 6 5"/></>,
  content:<><path d="M4 4h10v16H4zM14 8h6v12H10"/><path d="M7 8h4M7 12h4M7 16h2"/></>,
 };
 return <svg className="dashboard-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name]}</svg>;
}

export function DashboardNav({showAdminTools,properties}:{showAdminTools:boolean;properties:{id:string;name:string}[]}){
 const path=usePathname();
 const [open,setOpen]=useState(false);

 useEffect(()=>{setOpen(false)},[path]);
 useEffect(()=>{
  function closeOnEscape(event:KeyboardEvent){if(event.key==='Escape')setOpen(false)}
  document.addEventListener('keydown',closeOnEscape);
  return ()=>document.removeEventListener('keydown',closeOnEscape);
 },[]);

 return <aside className={`cms-sidebar dashboard-sidebar${open?' is-open':''}`}>
  <button className="dashboard-menu-toggle" type="button" aria-label={open?'Close dashboard navigation':'Open dashboard navigation'} aria-expanded={open} aria-controls="dashboard-navigation" onClick={()=>setOpen(value=>!value)}><span/><span/><span/></button>
  <button className="dashboard-menu-backdrop" type="button" aria-label="Close dashboard navigation" tabIndex={open?0:-1} onClick={()=>setOpen(false)}/>
  <div className="dashboard-sidebar-panel" id="dashboard-navigation">
   <nav aria-label="Your Land Club">{links.map(([label,href,icon])=><div className={href==='/dashboard/my-properties'?'dashboard-nav-group':undefined} key={href}><Link href={href} aria-current={(href==='/dashboard/my-properties'?path.startsWith(href):path===href)?'page':undefined} onClick={()=>setOpen(false)}><NavIcon name={icon}/><span>{label}</span></Link>{href==='/dashboard/my-properties'&&properties.length>0&&<div className="dashboard-property-subnav">{properties.map(property=><Link key={property.id} href={`/dashboard/my-properties/${property.id}`} aria-current={path===`/dashboard/my-properties/${property.id}`?'page':undefined} onClick={()=>setOpen(false)}><span>{property.name}</span></Link>)}</div>}</div>)}{showAdminTools&&<><div className="dashboard-nav-divider"/><div className="eyebrow">ADMIN TOOLS</div><Link href="/dashboard/members" aria-current={path.startsWith('/dashboard/members')?'page':undefined} onClick={()=>setOpen(false)}><NavIcon name="members"/><span>Members</span></Link><Link href="/dashboard/properties" aria-current={path.startsWith('/dashboard/properties')?'page':undefined} onClick={()=>setOpen(false)}><NavIcon name="content"/><span>Properties</span></Link><Link href="/dashboard/manage-documents" aria-current={path==='/dashboard/manage-documents'?'page':undefined} onClick={()=>setOpen(false)}><NavIcon name="documents"/><span>Documents</span></Link><Link href="/dashboard/manage-events" aria-current={path==='/dashboard/manage-events'?'page':undefined} onClick={()=>setOpen(false)}><NavIcon name="events"/><span>Events</span></Link></>}</nav>
  </div>
 </aside>
}
