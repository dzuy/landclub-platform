'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {PropertyEditor} from '@/components/property-editor';
import {getPropertyDetail} from './actions';

export function PropertyDrawer({id,title,onClose}:{id:string;title:string;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),saveBeforeClose=useRef<(()=>Promise<boolean>)|null>(null),savingClose=useRef(false),busy=useRef(false),outside=useRef(false);
 const [result,setResult]=useState<Awaited<ReturnType<typeof getPropertyDetail>>|null>(null);
 const [closing,setClosing]=useState(false),[waitingForSave,setWaitingForSave]=useState(false);const router=useRouter();
 useEffect(()=>{
  const modal=dialog.current!,previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
  modal.showModal();document.body.style.overflow='hidden';let active=true;
  getPropertyDetail(id).then(value=>{if(active)setResult(value);}).catch(()=>{if(active)setResult({ok:false,error:'Unable to load property. Close the drawer and try again.'});});
  return()=>{active=false;modal.close();document.body.style.overflow=overflow;previous?.focus();};
 },[id]);
 useEffect(()=>{if(!closing)return;const timer=window.setTimeout(()=>{onClose();router.refresh();},window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:220);return()=>window.clearTimeout(timer);},[closing,onClose,router]);
 async function close(){
  if(busy.current||savingClose.current)return;
  savingClose.current=true;setWaitingForSave(true);
  try{if(saveBeforeClose.current&&!await saveBeforeClose.current())return;setClosing(true);}
  finally{savingClose.current=false;setWaitingForSave(false);}
 }
 function isOutside(event:React.PointerEvent<HTMLDialogElement>|React.MouseEvent<HTMLDialogElement>){const r=event.currentTarget.getBoundingClientRect();return event.target===event.currentTarget&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom);}
 return <dialog ref={dialog} className={`member-drawer property-editor-drawer${closing?' is-closing':''}`} aria-labelledby="property-drawer-title" onCancel={event=>{event.preventDefault();close();}} onPointerDown={event=>{outside.current=isOutside(event);}} onPointerCancel={()=>{outside.current=false;}} onClick={event=>{if(outside.current&&isOutside(event))close();outside.current=false;}}>
  <header className="member-drawer-heading"><h1 id="property-drawer-title">{title}</h1><button type="button" className="secondary" aria-label={waitingForSave?"Saving before closing":"Close property details"} disabled={waitingForSave||closing} autoFocus onClick={close}>×</button></header>
  <div className="member-drawer-body">{!result?<p role="status">Loading property…</p>:!result.ok?<p role="alert">{result.error}</p>:<PropertyEditor initial={result.record} history={result.history} drawer onSaveBeforeClose={save=>{saveBeforeClose.current=save;}} onBusyChange={value=>{busy.current=value;}}/>}</div>
 </dialog>;
}
