'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {propertyCardOrder} from '@/lib/property-card-order';

type Preference={order:string[];version:number;readOnly?:boolean};
async function readPreference(signal?:AbortSignal):Promise<Preference>{
 const response=await fetch('/api/property-card-order',{cache:'no-store',signal});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to load property order.');return data;
}
export function usePropertyCardOrder(memberId:string,propertyIds:string[],dragging:boolean){
 const [order,setOrder]=useState<string[]>([]),[ready,setReady]=useState(false),[saving,setSaving]=useState(false),[readOnly,setReadOnly]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const version=useRef(0),busy=useRef(false),dirty=useRef(false),desired=useRef<string[]>([]),active=useRef(dragging),available=useRef(propertyIds),mounted=useRef(false);
 active.current=dragging;available.current=propertyIds;
 const legacyKey=`land-club:property-card-order:${memberId}`;
 const save=useCallback(async(next:string[],refreshVersion=false)=>{
  if(busy.current)return;
  busy.current=true;dirty.current=true;desired.current=next;setOrder(next);setSaving(true);setError('');setNotice('Saving property order…');
  try{
   if(refreshVersion)version.current=(await readPreference()).version;
   const response=await fetch('/api/property-card-order',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:next,version:version.current})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to save property order.');
   version.current=data.version;dirty.current=false;
   try{localStorage.removeItem(legacyKey);}catch{/* The database is authoritative. */}
   if(mounted.current){setOrder(data.order);setNotice('Property order saved to your account.');}
  }catch(e){if(mounted.current){setError(e instanceof Error?e.message:'Unable to save property order.');setNotice('');}}
  finally{busy.current=false;if(mounted.current)setSaving(false);}
 },[legacyKey]);
 const load=useCallback(async()=>{
  if(busy.current||active.current)return;
  try{
   const data=await readPreference();if(!mounted.current||busy.current||active.current||dirty.current||data.version<version.current)return;
   version.current=data.version;setOrder(data.order);setReadOnly(!!data.readOnly);setReady(true);setError('');
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Unable to load property order.');}
 },[]);
 useEffect(()=>{
  mounted.current=true;const controller=new AbortController();
  void (async()=>{
   try{
    const data=await readPreference(controller.signal);if(controller.signal.aborted)return;
    version.current=data.version;setOrder(data.order);setReadOnly(!!data.readOnly);setReady(true);
    // Import the old browser preference only when this account has no saved order.
    if(data.version===0&&!data.readOnly){
     let old:unknown;try{old=JSON.parse(localStorage.getItem(legacyKey)||'null');}catch{}
     if(Array.isArray(old)&&old.some(id=>available.current.includes(id)))await save(propertyCardOrder(available.current,old));
    }
   }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to load property order.');}
  })();
  const sync=()=>{if(!dirty.current&&document.visibilityState==='visible')void load();};
  window.addEventListener('focus',sync);document.addEventListener('visibilitychange',sync);const timer=setInterval(sync,30000);
  return()=>{mounted.current=false;controller.abort();clearInterval(timer);window.removeEventListener('focus',sync);document.removeEventListener('visibilitychange',sync);};
 },[legacyKey,load,save]);
 useEffect(()=>{
  const warn=(event:BeforeUnloadEvent)=>{if(dirty.current){event.preventDefault();event.returnValue='';}};
  window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
 },[]);
 return {order,ready,saving,readOnly,error,notice,save,retry:()=>dirty.current?save(desired.current,true):load(),reload:()=>{dirty.current=false;setError('');setNotice('');void load();}};
}
