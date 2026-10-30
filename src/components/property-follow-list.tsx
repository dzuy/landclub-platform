'use client';
import {SortablePropertyGrid} from './sortable-property-grid';
import {MemberPropertyCard} from './member-property-card';
import cardStyles from './member-property-card.module.css';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import type {MemberPropertyDetail} from '@/lib/member-property-presentation';

export function PropertyFollowList({initial,readOnly=false}:{initial:MemberPropertyDetail[];readOnly?:boolean}){
 const router=useRouter();
 const [properties,setProperties]=useState(initial),[tab,setTab]=useState<'mine'|'all'>('mine'),[pending,setPending]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const busy=useRef(false);
 useEffect(()=>{setProperties(initial);},[initial]);
 const mine=properties.filter(p=>p.following||p.roles.length||p.selectionOnly);
 const visible=tab==='mine'?mine:properties.filter(p=>!p.unpublished);
 async function refresh(){
  if(busy.current)return;busy.current=true;setPending('refresh');setError('');
  try{const response=await fetch('/api/property-follows',{cache:'no-store'}),data=await response.json();if(!response.ok)throw new Error(data.error);setProperties(data.properties);router.refresh();}catch(e){setError(e instanceof Error?e.message:'Unable to load properties. Please try again.');}finally{busy.current=false;setPending(null);}
 }
 async function follow(property:MemberPropertyDetail){
  if(readOnly||busy.current)return;
  busy.current=true;setPending(property.id);setError('');setNotice('');
  const following=!property.following;
  try{
   const response=await fetch('/api/property-follows',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({propertyId:property.id,following})});
   const data=await response.json();if(!response.ok)throw new Error(data.error);
   setProperties(data.properties);setNotice(following?`Following ${property.property.name}. Added to My Properties.`:`Unfollowed ${property.property.name}.${property.roles.length||property.selectionOnly?' Your existing property relationship remains.':''}`);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Unable to update following. Please try again.');}finally{busy.current=false;setPending(null);}
 }
 function actions(item:MemberPropertyDetail){return <div className="property-follow-actions">{item.automaticFollow?<><span className="property-follow-automatic">Automatically following</span><p className="property-follow-help">Included while you’re an investor, owner or property manager.</p></>:(item.following||!item.unpublished)&&<button className={item.following?'secondary':''} type="button" disabled={readOnly||!!pending} aria-label={`${item.following?'Unfollow':'Follow'} ${item.property.name}`} onClick={()=>void follow(item)}>{pending===item.id?(item.following?'Unfollowing…':'Following…'):item.following?'Unfollow':'Follow'}</button>}</div>;}
 return <>
  <div className="property-follow-tabs" role="tablist" aria-label="Properties">
   <button id="my-properties-tab" role="tab" aria-selected={tab==='mine'} aria-controls="property-list" tabIndex={tab==='mine'?0:-1} onClick={()=>setTab('mine')} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='End'){setTab('all');document.getElementById('all-properties-tab')?.focus();}}}>My Properties <span>{mine.length}</span></button>
   <button id="all-properties-tab" role="tab" aria-selected={tab==='all'} aria-controls="property-list" tabIndex={tab==='all'?0:-1} onClick={()=>setTab('all')} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='Home'){setTab('mine');document.getElementById('my-properties-tab')?.focus();}}}>All Properties <span>{properties.filter(p=>!p.unpublished).length}</span></button>
  </div>
  {readOnly&&<p className="muted">Following is read-only in View as. Exit the preview to make changes.</p>}
  {error&&<div className="property-follow-error" role="alert">{error} <button className="secondary" disabled={!!pending} onClick={()=>void refresh()}>Refresh properties</button></div>}
  <p className="property-follow-notice" role="status" aria-live="polite">{pending==='refresh'?'Refreshing properties…':notice}</p>
  <div id="property-list" role="tabpanel" aria-labelledby={tab==='mine'?'my-properties-tab':'all-properties-tab'} aria-busy={!!pending}>
  {visible.length?(tab==='mine'?<SortablePropertyGrid properties={visible} disabled={!!pending||readOnly} renderActions={actions}/>:<div className={cardStyles.grid}>{visible.map(item=><MemberPropertyCard key={item.id} detail={item} href={item.following||item.roles.length||item.selectionOnly?`/dashboard/my-properties/${item.id}`:`/properties/${item.property.slug}`} actions={actions(item)}/>)}</div>):<section className="panel member-properties-empty"><h2>{tab==='mine'?'Find a property to follow.':'No properties have been published yet.'}</h2><p>{tab==='mine'?'Follow properties to keep them here. Your investment, ownership and management relationships appear automatically.':'Published properties will appear here, including places that are coming soon or fully subscribed.'}</p>{tab==='mine'&&<button className="secondary" onClick={()=>{setTab('all');document.getElementById('all-properties-tab')?.focus();}}>Explore all properties</button>}</section>}
  </div>
 </>;
}
