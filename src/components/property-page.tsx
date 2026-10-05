'use client';
import {useEffect,useState} from 'react';
import {propertyStatus,propertyDisplay,type PropertyDraft} from '@/lib/schema';
import {factDefinitions,formatFact,travelTime,type FactKey} from '@/lib/property-facts';
import {CollectionMap} from './collection-map';
import {PropertyGallery} from './property-gallery';
import {PropertyInfrastructure,infrastructureKeys as infrastructure} from './property-infrastructure';
export function PropertyPage({property,preview=false}:{property:PropertyDraft;preview?:boolean}) {
 const p=propertyDisplay(property);
 const [dark,setDark]=useState(false);
 useEffect(()=>{try{setDark(localStorage.getItem('land-club-property-theme')==='dark');}catch{}},[]);
 function toggleTheme(){setDark(!dark);try{localStorage.setItem('land-club-property-theme',dark?'light':'dark');}catch{}}
 const facts=(keys:FactKey[])=>keys.filter(key=>p.facts[key]).map(key=><div key={key}><dt>{factDefinitions[key].label}</dt><dd>{formatFact(p.facts[key]!,p.currency,key==='share_price'||key==='annual_dues')}{p.facts[key]?.notes&&<p>{p.facts[key]!.notes}</p>}</dd></div>);
 const hasGallery=p.gallery.length>0||p.media.some(image=>image.kind==='image'&&(image.role==='aerial'||image.role==='site_plan'||image.role==='gallery'));
 const summaryKeys:FactKey[]=['share_price','total_shares','usage_allocation','shares_available'];
 const excluded=new Set<FactKey>([...summaryKeys,...infrastructure,'existing_structures','season_notes','recreation','nearby_attractions']);
 const remaining=(Object.keys(factDefinitions) as FactKey[]).filter(key=>!excluded.has(key)&&p.facts[key]);
 return <>{preview&&<div className="local-mode"><strong>Saved draft preview</strong><span>This is not the published page.</span></div>}<main className={'property-design property-detail'+(dark?' property-dark':'')}>
  <div className="property-title"><h1>{p.name}</h1><button className="theme-toggle" onClick={toggleTheme} aria-pressed={dark} aria-label="Use dark appearance">{dark?'Light mode':'Dark mode'}</button></div>
  {p.hero?<img className="property-hero" src={p.hero} alt={p.imageAlt}/>:<div className="property-hero property-image-placeholder">Images coming soon</div>}
  <nav className="property-section-nav" aria-label="Property sections"><a href="#overview">The Property</a>{hasGallery&&<a href="#gallery">Gallery</a>}{p.facts.existing_structures&&<a href="#structures">Existing Structures</a>}<a href="#area">The Area</a>{infrastructure.some(k=>p.facts[k])&&<a href="#infrastructure">Site & Infrastructure</a>}{p.phases.length>0&&<a href="#next">Now and Next</a>}<a className="property-back" href="/properties">All properties</a></nav>
  <div className="property-content">
   {p.isDemo&&<p className="property-demo">Example property: details, prices and availability are fictional. Proposed buildings are unbuilt.</p>}
   <section id="overview" className="property-overview"><div><h2>{p.headline}</h2><p className="property-subtitle">{p.region}{p.facts.total_acres&&` · ${formatFact(p.facts.total_acres)} acres`}</p><div className="cms-prose">{p.intro.split('\n').filter(Boolean).map((v,i)=><p key={i}>{v}</p>)}</div></div><aside className="property-interest"><h3>Interested in {p.name}?</h3><dl className="property-key-facts">{facts(summaryKeys)}</dl><span className="property-status">{propertyStatus(p)}</span><a className="button" href="/signin">Get involved</a></aside></section>
   <PropertyGallery property={p}/>
   {p.facts.existing_structures&&<section id="structures" className="property-block property-structures"><h2>Existing Structures</h2><dl>{facts(['existing_structures'])}</dl></section>}
   <section id="area" className="property-block property-area"><div><h2>The Area</h2><ul>{p.proximity.map(v=><li key={v.id}>{v.name}{v.minutes.value!==null&&v.minutes.state!=='Not yet determined'?` · ${travelTime(v.minutes.value)}${v.minutes.state==='Planned'?' (planned)':''}`:''}{v.notes&&<p>{v.notes}</p>}</li>)}</ul><p>{p.region}</p></div>{p.coordinates?.value&&p.coordinates.state==='Actual'&&<CollectionMap properties={[{slug:p.slug,name:p.name,category:p.category,status:propertyStatus(p),region:p.region,coordinates:p.coordinates.value}]}/>}</section>
   {(remaining.length>0||p.facts.season_notes||p.facts.recreation||p.facts.nearby_attractions)&&<section className="property-block"><h2>Area Details</h2><dl className="property-area-facts">{facts(['season_notes','recreation','nearby_attractions'])}{facts(remaining)}</dl></section>}
   <PropertyInfrastructure property={p}/>
   {p.phases.length>0&&<section id="next" className="property-block"><h2>Now and Next</h2><div className="property-phases">{p.phases.map(v=><article key={v.id}><h3>{v.name}</h3><p>{v.scope}</p><dl><div><dt>Budget</dt><dd>{formatFact(v.budget,p.currency,true)}{v.budget.notes&&<p>{v.budget.notes}</p>}</dd></div><div><dt>Timeline</dt><dd>{formatFact(v.timeline)}{v.timeline.notes&&<p>{v.timeline.notes}</p>}</dd></div></dl></article>)}</div></section>}
   {p.media.some(v=>v.kind!=='image'||(v.role!=='aerial'&&v.role!=='site_plan'&&v.role!=='gallery'))&&<section className="property-block"><h2>Plans & Media</h2><div className="property-media">{p.media.filter(v=>v.kind!=='image'||(v.role!=='aerial'&&v.role!=='site_plan'&&v.role!=='gallery')).map(v=><figure key={v.id}>{v.kind==='image'?<a href={v.url} target="_blank" rel="noreferrer"><img src={v.url} alt={v.alt} loading="lazy"/></a>:v.kind==='video'?<video controls preload="metadata" src={v.url} aria-label={v.alt}/>:<a href={v.url} target="_blank" rel="noreferrer">{v.alt}</a>}<figcaption>{v.caption} · {v.role.replaceAll('_',' ')} · {v.state}</figcaption></figure>)}</div></section>}
   {p.sections.map(s=><section className="property-block property-story" key={s.id} id={'story-'+s.id}><div><h2>{s.title}</h2>{s.body.split('\n').filter(Boolean).map((v,i)=><p key={i}>{v}</p>)}</div>{s.facts.length>0&&<dl>{s.facts.map((f,i)=><div key={i}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}</section>)}
  </div>
 </main></>;
}
