'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
const links=[['Home','/staff'],['My Properties','/staff/my-properties'],['Bookings','/staff/bookings'],['Documents','/staff/documents'],['Events','/staff/events'],['Profile & Settings','/staff/profile']];
export function DashboardNav({showAdminTools}:{showAdminTools:boolean}){const path=usePathname();return <nav aria-label="Your Land Club">{links.map(([label,href])=><Link key={href} href={href} aria-current={path===href?'page':undefined}>{label}</Link>)}{showAdminTools&&<><div className="dashboard-nav-divider"/><div className="eyebrow">ADMIN TOOLS</div><Link href="/staff/members" aria-current={path==='/staff/members'?'page':undefined}>Members</Link><Link href="/staff/properties" aria-current={path.startsWith('/staff/properties')?'page':undefined}>Property content</Link></>}</nav>}
