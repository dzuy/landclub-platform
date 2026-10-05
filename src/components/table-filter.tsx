'use client';
import {useEffect,useId,useRef,useState} from 'react';
import styles from '@/app/staff/members/members.module.css';

export function MultiFilter({label,options,selected,onChange}:{label:string;options:{id:string;name:string}[];selected:string[];onChange:(values:string[])=>void}){
 const container=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false);const menuId=useId();
 useEffect(()=>{if(!open)return;function outside(event:PointerEvent){if(!container.current?.contains(event.target as Node))setOpen(false);}document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
 return <div ref={container} className={styles.filter} onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}}}>
  <button ref={trigger} type="button" className={styles.filterTrigger} aria-expanded={open} aria-controls={menuId} onClick={()=>setOpen(value=>!value)}>{label}{selected.length>0&&<span className={styles.filterCount}>{selected.length}</span>}<span aria-hidden="true">⌄</span></button>
  {open&&<div id={menuId} className={styles.filterMenu}><fieldset><legend className={styles.srOnly}>Filter by {label.toLowerCase()}</legend>{options.length?options.map(option=><label key={option.id}><input type="checkbox" checked={selected.includes(option.id)} onChange={event=>onChange(event.target.checked?[...selected,option.id]:selected.filter(id=>id!==option.id))}/>{option.name}</label>):<p>No options available.</p>}</fieldset><button type="button" className="secondary" disabled={!selected.length} onClick={()=>onChange([])}>Clear {label.toLowerCase()}</button></div>}
 </div>;
}

