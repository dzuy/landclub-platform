'use client';
import {useEffect,useId,useRef,useState} from 'react';
import styles from './event-date-time.module.css';
function dateKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function readDate(value:string){const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d,12);}
export function EventDateTime({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){
 const [date='',time='']=value.split('T'),id=useId(),[open,setOpen]=useState(false);
 const [focused,setFocused]=useState(()=>date||dateKey(new Date()));
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLInputElement>(null);
 const current=readDate(focused),month=new Date(current.getFullYear(),current.getMonth(),1,12);
 useEffect(()=>{if(open)root.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();},[open,focused]);
 useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
 function showCalendar(){setFocused(/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(readDate(date).getTime())&&dateKey(readDate(date))===date?date:dateKey(new Date()));setOpen(true);}
 function close(){setOpen(false);trigger.current?.focus();}
 function move(days:number){const next=readDate(focused);next.setDate(next.getDate()+days);setFocused(dateKey(next));}
 function moveMonth(amount:number){const next=readDate(focused),day=next.getDate();next.setDate(1);next.setMonth(next.getMonth()+amount);next.setDate(Math.min(day,new Date(next.getFullYear(),next.getMonth()+1,0).getDate()));setFocused(dateKey(next));}
 return <div ref={root} className={styles.field} onBlur={e=>{if(e.relatedTarget instanceof Node&&!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{if(open&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}}}>
  <span className={styles.label}>{label}</span><div className={styles.inputs}>
   <label htmlFor={`${id}-date`}>Date<input ref={trigger} id={`${id}-date`} aria-expanded={open} aria-controls={`${id}-calendar`} onClick={showCalendar} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();showCalendar();}}} aria-label={`${label} date (YYYY-MM-DD)`} required pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" placeholder="YYYY-MM-DD" value={date} onChange={e=>onChange(`${e.target.value}T${time}`)}/></label>
   <div className={styles.time}><label>Hour<select aria-label={`${label} hour`} required value={time.split(':')[0]||''} onChange={e=>onChange(`${date}T${e.target.value}:${time.split(':')[1]||''}`)}><option value="">HH</option>{Array.from({length:24},(_,h)=>String(h).padStart(2,'0')).map(h=><option key={h}>{h}</option>)}</select></label><label>Minute<select aria-label={`${label} minute`} required value={time.split(':')[1]||''} onChange={e=>onChange(`${date}T${time.split(':')[0]||''}:${e.target.value}`)}><option value="">MM</option>{time.split(':')[1]&&!['00','15','30','45'].includes(time.split(':')[1])&&<option hidden value={time.split(':')[1]}>{time.split(':')[1]}</option>}{['00','15','30','45'].map(m=><option key={m}>{m}</option>)}</select></label></div>
  </div>
  {open&&<div id={`${id}-calendar`} className={styles.calendar} role="group" aria-label={`Choose ${label.toLowerCase()} date`}>
   <div className={styles.month}><button type="button" className="secondary" aria-label="Previous month" onClick={()=>moveMonth(-1)}>←</button><strong aria-live="polite">{month.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong><button type="button" className="secondary" aria-label="Next month" onClick={()=>moveMonth(1)}>→</button></div>
   <div className={styles.days}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=><span key={day} aria-hidden="true">{day}</span>)}{Array.from({length:42},(_,index)=>{
    const cell=new Date(month.getFullYear(),month.getMonth(),index-month.getDay()+1,12),key=dateKey(cell);
    return <button type="button" key={key} data-date={key} tabIndex={focused===key?0:-1} aria-label={cell.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})} aria-pressed={date===key} aria-current={key===dateKey(new Date())?'date':undefined} className={cell.getMonth()!==month.getMonth()?styles.outside:undefined} onClick={()=>{onChange(`${key}T${time}`);close();}} onKeyDown={e=>{
     const steps:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-cell.getDay(),End:6-cell.getDay()};
     if(e.key in steps){e.preventDefault();move(steps[e.key]);}else if(e.key==='PageUp'||e.key==='PageDown'){e.preventDefault();moveMonth(e.key==='PageUp'?-1:1);}
    }}>{cell.getDate()}</button>;
   })}</div><p>Arrow keys change day. Page Up/Down change month. Escape closes.</p>
  </div>}
 </div>;
}
