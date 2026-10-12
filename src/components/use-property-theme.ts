'use client';
import {useEffect,useState} from 'react';
const key='land-club-property-theme';
export function usePropertyTheme(){
 const [dark,setDark]=useState(false);
 useEffect(()=>{
  const read=()=>{try{setDark(localStorage.getItem(key)==='dark');}catch{}};
  const update=(event:Event)=>setDark((event as CustomEvent<boolean>).detail);
  read();window.addEventListener('storage',read);window.addEventListener(key,update);
  return ()=>{window.removeEventListener('storage',read);window.removeEventListener(key,update);};
 },[]);
 function toggleTheme(){const next=!dark;setDark(next);try{localStorage.setItem(key,next?'dark':'light');}catch{}window.dispatchEvent(new CustomEvent(key,{detail:next}));}
 return {dark,toggleTheme};
}
