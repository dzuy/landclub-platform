import type {Metadata} from 'next';
import './globals.css';
import {clubIdentity} from '@/lib/staff';
import {currentUser} from '@/lib/auth/identity';
import {AccountMenu} from '@/components/account-menu';
export const metadata:Metadata={title:'Land Club',description:'Distinctive places. A shared sense of belonging.',robots:{index:false,follow:false}};

export default async function Layout({children}:{children:React.ReactNode}){const member=await clubIdentity();const user=await currentUser();const identity=member||user;const email=user?.email||member?.name||'';const role=member?member.roles.map(value=>value[0].toUpperCase()+value.slice(1)).join(', '):'Member';return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Newsreader:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet"/><link rel="stylesheet" href="/vendor/leaflet.css"/><link rel="icon" href="/favicon.svg"/></head><body><header className="top"><a className="brand" href="/">land club</a><nav><a href="/">Explore properties</a>{member?<a href="/staff">Your Land Club</a>:user?<a href="/account">Your account</a>:<a className="auth-nav-link" href="/signin">Sign in</a>}{identity&&<AccountMenu email={email} role={role}/>}</nav></header>{children}{!member&&<footer><a className="brand" href="/">land club</a><p>Distinctive places. A shared sense of belonging.</p></footer>}</body></html>}
