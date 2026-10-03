'use client';
import {useState} from 'react';
import {propertyStatus, type PropertyDraft} from '@/lib/schema';
const categories=['All','Mountains','Coast','Farms','Desert','Heritage','Unclassified'];
export function DiscoveryHome({properties}:{properties:PropertyDraft[]}) {
 const [category,setCategory]=useState('All');
 const visible=properties.filter(p=>category==='All'||p.category===category);
 return <main className="property-design property-index"><h1>Properties</h1>
  <nav className="property-filters" aria-label="Filter properties by landscape">{categories.filter(c=>c==='All'||properties.some(p=>p.category===c)).map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</nav>
  <div className="property-index-grid">{visible.map(p=><article key={p.slug}><a href={'/properties/'+p.slug} className="property-index-photo">{p.hero?<img src={p.hero} alt={p.imageAlt} loading="lazy"/>:<span>Image coming soon</span>}</a><div className="property-card-title"><h2><a href={'/properties/'+p.slug}>{p.name}</a></h2><span className="property-status">{propertyStatus(p)}</span></div><p>{p.summary}</p><p className="property-location">{p.region}{p.facts.total_acres&&p.facts.total_acres.state==='Actual'?` · ${p.facts.total_acres.value} acres`:''}</p></article>)}</div>
  {!visible.length&&<p className="empty">No properties have been published yet.</p>}
 </main>;
}
