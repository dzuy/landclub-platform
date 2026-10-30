'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState} from 'react';

type IconName='dashboard'|'money'|'properties'|'bookings'|'documents'|'events'|'profile'|'members'|'content';
const links:[string,string,IconName][]=[['Dashboard','/dashboard','dashboard'],['My Properties','/dashboard/my-properties','properties'],['Investments','/dashboard/portfolio','money'],['Bookings','/dashboard/bookings','bookings'],['Documents','/dashboard/documents','documents'],['Events','/dashboard/events','events']];

function NavIcon({name}:{name:IconName}){
 const shapes={
  dashboard:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  money:<><circle cx="12" cy="12" r="9"/><path d="M12 6v12M15 8.5h-4.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H9"/></>,
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

export function DashboardNav({showAdminTools,properties,portfolio}:{showAdminTools:boolean;properties:{id:string;name:string}[];portfolio:{id:string;name:string}[]}){
 const path=usePathname();
 const [open,setOpen]=useState(false);
 const [collapsed,setCollapsed]=useState({properties:false,portfolio:false});
 const [hash,setHash]=useState('');
 useEffect(()=>{
  try{const saved=JSON.parse(localStorage.getItem('land-club:nav-collapse')||'{}');setCollapsed({properties:saved?.properties===true,portfolio:!path.startsWith('/investment-access')&&saved?.portfolio===true});}catch{/* Navigation works without browser storage. */}
  const readHash=()=>setHash(window.location.hash);readHash();
  window.addEventListener('hashchange',readHash);
  return ()=>window.removeEventListener('hashchange',readHash);
 },[path]);
 function toggleGroup(group:'properties'|'portfolio'){
  const next={...collapsed,[group]:!collapsed[group]};setCollapsed(next);
  try{localStorage.setItem('land-club:nav-collapse',JSON.stringify(next));}catch{/* Keep the toggle usable when storage is unavailable. */}
 }


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
   <nav aria-label="Your Land Club">{links.map(([label,href,icon])=>{
    const group=href==='/dashboard/my-properties'?'properties':href==='/dashboard/portfolio'?'portfolio':null;
    const items=group==='properties'?properties:group==='portfolio'?portfolio:[];
    const expanded=group?!collapsed[group]:false;
    const subnavId=`dashboard-${group}-subnav`;
    return <div className={group?'dashboard-nav-group':undefined} key={href}>
     <div className="dashboard-nav-row"><Link href={href} aria-current={group==='portfolio'&&path.startsWith('/investment-access')?'location':(group?path.startsWith(href):path===href)?'page':undefined} onClick={()=>setOpen(false)}><NavIcon name={icon}/><span>{label}</span></Link>{group&&<button type="button" className="dashboard-group-toggle" aria-label={`${expanded?'Collapse':'Expand'} ${label}`} aria-expanded={expanded} aria-controls={subnavId} onClick={()=>toggleGroup(group)}><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={expanded?'m5 7 5 5 5-5':'m7 5 5 5-5 5'}/></svg></button>}</div>
     {group&&<div id={subnavId} className="dashboard-property-subnav" hidden={!expanded||(group!=='portfolio'&&!items.length)}>{items.map(item=>{
      const destination=group==='properties'?`/dashboard/my-properties/${item.id}`:`/dashboard/portfolio#position-${item.id}`;
      const active=group==='properties'?path===destination:path==='/dashboard/portfolio'&&(hash===`#position-${item.id}`||(!hash&&item.id===portfolio[0]?.id));
      return <a key={item.id} href={destination} aria-current={active?'page':undefined} onClick={()=>setOpen(false)}><span>{item.name}</span></a>;
     })}{group==='portfolio'&&<Link href="/investment-access" aria-current={path.startsWith('/investment-access')?'page':undefined} onClick={()=>setOpen(false)}><span>Investment sharing</span></Link>}</div>}
    </div>;
   })}{showAdminTools&&<><div className="dashboard-nav-divider"/><div className="eyebrow">ADMIN TOOLS</div><Link href="/dashboard/members" aria-current={path.startsWith('/dashboard/members')?'page':undefined} onClick={()=>setOpen(false)}><NavIcon name="members"/><span>Members</span></Link><Link href="/dashboard/properties" aria-current={path.startsWith('/dashboard/properties')?'page':undefined} onClick={()=>setOpen(false)}><NavIcon name="content"/><span>Properties</span></Link><Link href="/dashboard/manage-documents" aria-current={path==='/dashboard/manage-documents'?'page':undefined} onClick={()=>setOpen(false)}><NavIcon name="documents"/><span>Documents</span></Link><Link href="/dashboard/manage-events" aria-current={path==='/dashboard/manage-events'?'page':undefined} onClick={()=>setOpen(false)}><NavIcon name="events"/><span>Events</span></Link></>}</nav>
  </div>
 </aside>
}
