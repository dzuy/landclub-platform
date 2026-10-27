'use client';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import s from './website.module.css';
const links=[['Norden Cross','/properties/norden-cross'],['Properties','/properties'],['How It Works','/how-it-works'],['About','/about'],['Events','/events']];
function isPublic(path:string){return ['/', '/how-it-works','/about','/events','/events/festa-italiana','/events/cocktails-and-trails-ii'].includes(path)||path.startsWith('/properties');}
export function SiteHeader({legacy,authenticated=false}:{legacy:ReactNode;authenticated?:boolean}){
 const menuButton=useRef<HTMLButtonElement>(null);const navigation=useRef<HTMLElement>(null);
 const path=usePathname();const [scrolled,setScrolled]=useState(false);const [open,setOpen]=useState(false);
 useEffect(()=>{const update=()=>setScrolled(window.scrollY>40);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update);},[]);
 useEffect(()=>setOpen(false),[path]);
 useEffect(()=>{if(open)navigation.current?.querySelector<HTMLAnchorElement>('a')?.focus();},[open]);
 if(!isPublic(path))return legacy;
 const solid=scrolled||path.startsWith('/properties')||open||path==='/';
 return <header onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();setOpen(false);menuButton.current?.focus();}}} className={`${s.header} ${solid?s.solid:''} ${path.startsWith('/properties')?s.propertyHeader:''}`}>{!path.startsWith('/properties')&&<a className={s.skip} href="#main-content">Skip to content</a>}<div className={s.navInner}><a className={s.wordmark} href="/">Land Club</a><nav ref={navigation} id="public-navigation" className={`${s.nav} ${open?s.navOpen:''}`} aria-label="Main navigation">{links.map(([label,href])=><a key={href} href={href} aria-current={path===href?'page':undefined}>{label}</a>)}<a className={s.mobileSignIn} href={authenticated?'/dashboard':'/signin'}>{authenticated?'Dashboard':'Member sign in'}</a></nav><div className={s.navActions}><a className={`${s.button} ${s.signIn}`} href={authenticated?'/dashboard':'/signin'}>{authenticated?'Dashboard':'Sign in'}</a>{!authenticated&&<a className={`${s.button} ${solid?'':s.light}`} href="/#join">Join The Club</a>}</div><button ref={menuButton} aria-controls="public-navigation" className={s.menu} aria-expanded={open} aria-label={open?'Close navigation':'Open navigation'} onClick={()=>setOpen(!open)}>{open?'Close':'Menu'}</button></div></header>;
}
export function SiteFooter({legacy,authenticated=false}:{legacy:ReactNode;authenticated?:boolean}){const path=usePathname();if(!isPublic(path))return legacy;return <footer className={s.footer}><div className={s.container}><div className={s.two}><a className={s.wordmark} href="/">Land Club</a><div><strong>Site map</strong><nav aria-label="Footer navigation" className={s.footerLinks}>{[['Home','/'],...links,['Contact','/about#contact'],[authenticated?'Dashboard':'Member sign in',authenticated?'/dashboard':'/signin']].map(([label,href])=><a key={href} href={href}>{label}</a>)}</nav></div></div><p className={s.copyright}>© 2026 Land Club</p></div></footer>;}
