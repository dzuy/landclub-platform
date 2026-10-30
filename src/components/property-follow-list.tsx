'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {photoThumbnailUrl} from '@/lib/photo-thumbnail-url';
import {homePropertyPhoto} from '@/lib/member-home';
import {propertyRoleLabels} from '@/lib/member-properties';
import {propertyStatus} from '@/lib/schema';
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
 return <>
  <div className="property-follow-tabs" role="tablist" aria-label="Properties">
   <button id="my-properties-tab" role="tab" aria-selected={tab==='mine'} aria-controls="property-list" tabIndex={tab==='mine'?0:-1} onClick={()=>setTab('mine')} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='End'){setTab('all');document.getElementById('all-properties-tab')?.focus();}}}>My Properties <span>{mine.length}</span></button>
   <button id="all-properties-tab" role="tab" aria-selected={tab==='all'} aria-controls="property-list" tabIndex={tab==='all'?0:-1} onClick={()=>setTab('all')} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='Home'){setTab('mine');document.getElementById('my-properties-tab')?.focus();}}}>All Properties <span>{properties.filter(p=>!p.unpublished).length}</span></button>
  </div>
  {readOnly&&<p className="muted">Following is read-only in View as. Exit the preview to make changes.</p>}
  {error&&<div className="property-follow-error" role="alert">{error} <button className="secondary" disabled={!!pending} onClick={()=>void refresh()}>Refresh properties</button></div>}
  <p className="property-follow-notice" role="status" aria-live="polite">{pending==='refresh'?'Refreshing properties…':notice}</p>
  <div id="property-list" role="tabpanel" aria-labelledby={tab==='mine'?'my-properties-tab':'all-properties-tab'} aria-busy={!!pending}>
  {visible.length?<div className="member-property-grid">{visible.map(item=>{
   const {id,roles,property,selectionOnly,unpublished,following,automaticFollow}=item,thumbnail=homePropertyPhoto(property);
   const mineItem=!!(following||roles.length||selectionOnly),href=mineItem?`/dashboard/my-properties/${id}`:`/properties/${property.slug}`;
   return <article className="member-property-card" key={id} aria-label={property.name}>
    <Link className="member-property-card-image" href={href} aria-label={`View ${property.name}`}>{thumbnail?<img src={photoThumbnailUrl(thumbnail.src)} loading="lazy" decoding="async" alt={thumbnail.alt}/>:<span className="property-photo-empty">Property photography coming soon</span>}</Link>
    <div className="member-property-card-body"><div className="eyebrow">{property.region}</div><h2><Link href={href}>{property.name}</Link></h2><p>{property.summary}</p>
     <div className="member-property-card-meta"><span className="badge">{propertyStatus(property)}</span>{roles.map(role=><span className="badge" key={role}>{propertyRoleLabels[role]}</span>)}{selectionOnly&&<span className="badge">Selected property</span>}{following&&<span className="badge">{roles.length||selectionOnly?'Following':'Follower'}</span>}{unpublished&&<span className="badge">Unpublished</span>}</div>
     <div className="property-follow-actions"><Link className="button secondary" href={href}>View property</Link>{automaticFollow?<span className="property-follow-automatic">Automatically following</span>:(following||!unpublished)&&<button className={following?'secondary':''} type="button" disabled={readOnly||!!pending} aria-label={`${following?'Unfollow':'Follow'} ${property.name}`} onClick={()=>void follow(item)}>{pending===id?(following?'Unfollowing…':'Following…'):following?'Unfollow':'Follow'}</button>}</div>
     {automaticFollow&&<p className="property-follow-help">Included while you’re an investor, owner or property manager.</p>}
    </div>
   </article>;
  })}</div>:<section className="panel member-properties-empty"><h2>{tab==='mine'?'Find a property to follow.':'No properties have been published yet.'}</h2><p>{tab==='mine'?'Follow properties to keep them here. Your investment, ownership and management relationships appear automatically.':'Published properties will appear here, including places that are coming soon or fully subscribed.'}</p>{tab==='mine'&&<button className="secondary" onClick={()=>{setTab('all');document.getElementById('all-properties-tab')?.focus();}}>Explore all properties</button>}</section>}
  </div>
 </>;
}
