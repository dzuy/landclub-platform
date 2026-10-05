'use client';
import {PageHeading} from '@/components/page-heading';
import {useEffect,useRef,useState,useTransition} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import type {ClubEvent} from '@/lib/events';
import {DataTable,type TableColumn} from '@/components/data-table';
import {saveEvent} from './actions';
import styles from './events.module.css';
const empty={title:'',description:'',start:'',end:'',location:'',meetingUrl:'',status:'scheduled' as 'scheduled'|'cancelled'|'archived'};
type Column='title'|'startsAt'|'location'|'status'|'edit';
const columns:TableColumn<Column>[]=[{key:'title',label:'Title',width:240,min:140},{key:'startsAt',label:'Date & time',width:230,min:160},{key:'location',label:'Location',width:200,min:120},{key:'status',label:'Status',width:120,min:100},{key:'edit',label:'Edit',width:70,min:70,sortable:false}];
function localDate(iso:string){const d=new Date(iso);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
function statusName(status:string){return status[0].toUpperCase()+status.slice(1);}
function EditIcon(){return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6L16 3Z"/><path d="m13 6 5 5"/></svg>;}

function EventDrawer({event,onClose,onSaved}:{event:ClubEvent|null;onClose:()=>void;onSaved:(event:ClubEvent)=>void}){
 const [initial]=useState(()=>event?{title:event.details.title,description:event.details.description,start:localDate(event.details.startsAt),end:localDate(event.details.endsAt),location:event.details.location,meetingUrl:event.details.meetingUrl,status:event.details.status}:empty);
 const [form,setForm]=useState(initial),[error,setError]=useState(''),[pending,startTransition]=useTransition(),[closing,setClosing]=useState(false);
 const [timeZone]=useState(()=>Intl.DateTimeFormat().resolvedOptions().timeZone);
 const dialog=useRef<HTMLDialogElement>(null),outside=useRef(false);const dirty=JSON.stringify(form)!==JSON.stringify(initial);
 useEffect(()=>{const modal=dialog.current!,previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;modal.showModal();document.body.style.overflow='hidden';return()=>{modal.close();document.body.style.overflow=overflow;previous?.focus();};},[]);
 useEffect(()=>{if(!dirty)return;const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
 useEffect(()=>{if(!closing)return;const timer=setTimeout(onClose,window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:220);return()=>clearTimeout(timer);},[closing,onClose]);
 function close(){if(pending)return;if(dirty&&!confirm('Discard unsaved event changes?'))return;setClosing(true);}
 function isOutside(e:React.PointerEvent<HTMLDialogElement>|React.MouseEvent<HTMLDialogElement>){const r=e.currentTarget.getBoundingClientRect();return e.target===e.currentTarget&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);}
 return <dialog ref={dialog} className={`member-drawer${closing?' is-closing':''}`} aria-labelledby="event-drawer-title" onCancel={e=>{e.preventDefault();close();}} onPointerDown={e=>{outside.current=isOutside(e);}} onPointerCancel={()=>{outside.current=false;}} onClick={e=>{if(outside.current&&isOutside(e))close();outside.current=false;}}>
  <header className="member-drawer-heading"><h1 id="event-drawer-title">{event?'Edit event':'New event'}</h1><button type="button" className="secondary" aria-label="Close event details" disabled={pending} autoFocus onClick={close}>×</button></header>
  <div className="member-drawer-body"><form className={styles.form} onSubmit={e=>{e.preventDefault();setError('');startTransition(async()=>{try{const result=await saveEvent({title:form.title,description:form.description,location:form.location,meetingUrl:form.meetingUrl,status:form.status,startsAt:new Date(form.start).toISOString(),endsAt:new Date(form.end).toISOString(),timeZone},event?.id,event?.version);if(result.error){setError(result.error);return;}if(result.event)onSaved(result.event);}catch{setError('Unable to save. Check the dates and try again.');}});}}>
   <div className={styles.save}><button disabled={pending||!!event&&!dirty}>{pending?'Saving…':'Save Event'}</button></div>
   {error&&<p role="alert" className="cms-error">{error}</p>}
   <fieldset disabled={pending} className={styles.fields}>
    <label>Title<input required maxLength={150} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
    <label>Description<textarea required maxLength={10000} rows={5} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
    <label>Start<input required type="datetime-local" value={form.start} onChange={e=>setForm({...form,start:e.target.value})}/></label>
    <label>End<input required type="datetime-local" value={form.end} onChange={e=>setForm({...form,end:e.target.value})}/></label>
    <p className="muted">Times are entered in {timeZone}.</p>
    <label>Location<input required maxLength={300} placeholder="Venue and address, or Online" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label>
    <label>Meeting or event link (optional)<input type="url" placeholder="https://" value={form.meetingUrl} onChange={e=>setForm({...form,meetingUrl:e.target.value})}/></label>
    <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as typeof form.status})}><option value="scheduled">Scheduled — visible to members</option><option value="cancelled">Cancelled — visible with cancellation notice</option><option value="archived">Archived — hidden from members</option></select></label>
   </fieldset>
  </form></div>
 </dialog>;
}

export function EventManager({initial}:{initial:ClubEvent[]}){
 const [events,setEvents]=useState(initial),[selected,setSelected]=useState<ClubEvent|null|undefined>(),[search,setSearch]=useState(''),[message,setMessage]=useState('');
 const [sort,setSort]=useState<{column:Column;direction:'asc'|'desc'}>({column:'startsAt',direction:'asc'});const router=useRouter();
 useEffect(()=>{setEvents(initial);},[initial]);
 const query=search.trim().toLowerCase();
 const visible=events.filter(event=>`${event.details.title} ${event.details.location} ${event.details.status}`.toLowerCase().includes(query)).sort((a,b)=>{const column=sort.column==='edit'?'title':sort.column;const order=column==='startsAt'?Date.parse(a.details.startsAt)-Date.parse(b.details.startsAt):a.details[column].localeCompare(b.details[column],undefined,{numeric:true,sensitivity:'base'});return (sort.direction==='asc'?1:-1)*(order||a.details.title.localeCompare(b.details.title));});
 return <><PageHeading title="Events"><div className="row-actions"><Link className="button secondary" href="/staff/events">View events</Link><button onClick={()=>setSelected(null)}>+ New Event</button></div></PageHeading>
  <div className={styles.tools}><input type="search" aria-label="Search events" placeholder="Search by title, location or status" value={search} onChange={e=>setSearch(e.target.value)}/><span className="muted" role="status">{query?`${visible.length} of ${events.length}`:events.length} events</span></div>
  {message&&<p role="status" className="cms-success">{message}</p>}
  <DataTable columns={columns} label="Events" sort={sort} onSort={column=>setSort({column,direction:sort.column===column&&sort.direction==='asc'?'desc':'asc'})}>
   {visible.map(event=><tr key={event.id} className={styles.row} onClick={e=>{if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;if(e.target instanceof Element&&e.target.closest('button,a,input,select,textarea'))return;if(window.getSelection()?.toString())return;setSelected(event);}}>
    <td><button className={styles.title} onClick={()=>setSelected(event)}>{event.details.title}</button></td>
    <td><time dateTime={event.details.startsAt}>{new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:event.details.timeZone}).format(new Date(event.details.startsAt))}</time><small className={styles.zone}>{event.details.timeZone}</small></td>
    <td>{event.details.location}</td><td><span className={`badge ${styles[event.details.status]}`}>{statusName(event.details.status)}</span></td>
    <td><button className={styles.edit} aria-label={`Edit ${event.details.title}`} onClick={()=>setSelected(event)}><EditIcon/></button></td>
   </tr>)}{!visible.length&&<tr><td colSpan={columns.length}>{events.length?'No events match your search.':'No events yet.'}</td></tr>}
  </DataTable>
  {selected!==undefined&&<EventDrawer key={selected?.id||'new'} event={selected} onClose={()=>setSelected(undefined)} onSaved={event=>{setEvents(rows=>[...rows.filter(row=>row.id!==event.id),event]);setSelected(undefined);setMessage('Event saved.');router.refresh();}}/>}
 </>;
}
