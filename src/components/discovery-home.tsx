'use client';
import {photoThumbnailUrl} from '@/lib/photo-thumbnail-url';
import {useState} from 'react';
import {propertyDisplay, type PropertyDraft} from '@/lib/schema';
const categories=['All','Mountains','Coast','Farms','Desert','Heritage','Unclassified'];
const categoryLabels:Record<string,string>={Mountains:'Mountain',Coast:'Coastal',Farms:'Farm'};
export function DiscoveryHome({properties}:{properties:PropertyDraft[]}) {
 const [category,setCategory]=useState('All');
 const visible=properties.map(p=>({...propertyDisplay(p),region:p.region})).filter(p=>category==='All'||p.category===category);
 return <main className="property-design property-index"><h1>Properties</h1>
  <nav className="property-filters" aria-label="Filter properties by landscape">{categories.filter(c=>c==='All'||properties.some(p=>p.category===c)).map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{categoryLabels[c]??c}</button>)}</nav>
  <div className="property-index-grid">{visible.map(p=><article key={p.slug}><a href={'/properties/'+p.slug} className="property-index-photo">{p.hero?<img src={photoThumbnailUrl(p.hero)} alt={p.imageAlt} loading="lazy"/>:<span>Image coming soon</span>}</a><div className="property-card-title"><h2><a href={'/properties/'+p.slug}>{p.name}</a></h2>{p.offeringStatus&&<span className={'property-status'+(p.offeringStatus==='Available'?' property-status-available':'')}>{p.offeringStatus}</span>}</div><p>{p.summary}</p>{(p.region||(p.facts.total_acres?.state==='Actual'))&&<p className="property-location">{[p.region,p.facts.total_acres?.state==='Actual'?`${p.facts.total_acres.value} acres`:''].filter(Boolean).join(' · ')}</p>}</article>)}</div>
  {!visible.length&&<p className="empty">No properties have been published yet.</p>}
 </main>;
}
