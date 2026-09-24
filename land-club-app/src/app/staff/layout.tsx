import {redirect} from 'next/navigation';
import {staffIdentity} from '@/lib/staff';
import {signOut} from '@/app/signin/actions';
export const dynamic='force-dynamic';
export default async function StaffLayout({children}:{children:React.ReactNode}){const actor=await staffIdentity();if(!actor)redirect('/signin');return <>{actor.local&&<div className="local-mode"><strong>Local development workspace</strong><span>Changes are saved on this computer. Local editor access is enabled.</span></div>}<div className="cms-shell"><aside className="cms-sidebar"><div className="eyebrow">LAND CLUB / STAFF</div><a href="/staff/properties" aria-current="page">Property content</a><a href="/">View published pages ↗</a><p>{actor.name}</p>{!actor.local&&<form action={signOut}><button className="secondary">Sign out</button></form>}</aside><main className="cms-main">{children}</main></div></>}
