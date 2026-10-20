import 'mapbox-gl/dist/mapbox-gl.css';
import {profilePhotoUrl} from '@/lib/profile-photo';
import type {Metadata} from 'next';
import './globals.css';
import {SiteHeader,SiteFooter} from '@/components/website/chrome';
import {investorPlatformStore} from '@/lib/investor-platform-store';
import {clubIdentity,authenticatedIdentity} from '@/lib/staff';
import {currentUser} from '@/lib/auth/identity';
import {AccountMenu} from '@/components/account-menu';
export const metadata:Metadata={title:'Land Club',description:'Distinctive places. A shared sense of belonging.',robots:{index:false,follow:false}};

export default async function Layout({children}:{children:React.ReactNode}){const member=await clubIdentity();const admin=await authenticatedIdentity();const platform=admin?.admin?await investorPlatformStore():null;const previewPeople=platform&&await platform.ready()?await platform.people(admin):undefined;const user=await currentUser();const identity=member||user;return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Figtree:wght@400;500;600&family=Plus+Jakarta+Sans:wght@300;600;700&family=Manrope:wght@400;500;600;700&family=Newsreader:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet"/><link rel="stylesheet" href="/vendor/leaflet.css"/><link rel="icon" href="/favicon.svg"/></head><body><SiteHeader legacy={<header className="top"><a className="brand" href="/">land club</a><nav className="primary-nav" aria-label="Main navigation"><a href="/properties">Properties</a><a href="/how-it-works">How It Works</a><a href="/about">About</a></nav><nav className="account-nav" aria-label="Account navigation">{member?<a href="/dashboard">Dashboard</a>:user?<a href="/account">Your account</a>:<a className="auth-nav-link" href="/signin">Sign in</a>}<AccountMenu previewPeople={previewPeople?.filter(p=>!p.disabled_at).map(p=>({id:p.id,name:p.display_name}))} previewPersonId={member?.preview?.personId} photoUrl={user&&!member?.preview?profilePhotoUrl(user.id,user.user_metadata):null} authenticated={Boolean(identity)}/></nav></header>}/>{children}<SiteFooter legacy={<footer className={member?'member-public-footer':undefined}><a className="brand" href="/">land club</a><p>Distinctive places. A shared sense of belonging.</p></footer>}/></body></html>}
