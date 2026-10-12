'use client';
import {photoThumbnailUrl} from '@/lib/photo-thumbnail-url';
import {propertyLocationQueries} from '@/lib/property-map';
import {PropertyMap} from './property-map';
import {hasPublicFact,hasPublicValue,visiblePropertyFields} from '@/lib/public-property-fields';
import {usePropertyTheme} from './use-property-theme';
import {propertyStatus,propertyDisplay,type PropertyDraft} from '@/lib/schema';
import {factDefinitions,formatFact,type FactKey} from '@/lib/property-facts';
import {PropertyGallery} from './property-gallery';
import {PropertyInfrastructure,infrastructureKeys as infrastructure} from './property-infrastructure';
export function PropertyPage({property,preview=false,embedded=false,showInterest=true}:{property:PropertyDraft;preview?:boolean;embedded?:boolean;showInterest?:boolean}) {
 const Container=embedded?'div':'main';
 const p={...propertyDisplay(visiblePropertyFields(property)),region:hasPublicValue(property.region)?property.region:''};
 const hasArea=propertyLocationQueries(property).length>0||hasPublicFact(p.coordinates??undefined)||p.proximity.length>0||(hasPublicValue(property.region)&&property.region!=='Location to be confirmed');
 const {dark}=usePropertyTheme();
 const facts=(keys:FactKey[])=>keys.filter(key=>p.facts[key]).map(key=><div key={key}><dt>{factDefinitions[key].label}</dt><dd>{formatFact(p.facts[key]!,p.currency,key==='share_price'||key==='annual_dues')}</dd></div>);
 const hasGallery=p.gallery.length>0||p.media.some(image=>image.kind==='image'&&(image.role==='aerial'||image.role==='site_plan'||image.role==='gallery'));
 const summaryKeys:FactKey[]=['share_price','total_shares','usage_allocation','shares_available'];
 const excluded=new Set<FactKey>([...summaryKeys,...infrastructure,'existing_structures','season_notes','recreation','nearby_attractions']);
 const remaining=(Object.keys(factDefinitions) as FactKey[]).filter(key=>!excluded.has(key)&&p.facts[key]);
 return <>{preview&&<div className="local-mode"><strong>Saved draft preview</strong><span>This is not the published page.</span></div>}<Container className={'property-design property-detail'+(dark?' property-dark':'')}>
  <div className="property-title"><h1>{p.name}</h1></div>
  {p.hero?<img className="property-hero" src={p.hero} alt={p.imageAlt}/>:<div className="property-hero property-image-placeholder">Images coming soon</div>}
  <nav className="property-section-nav" aria-label="Property sections"><a href="#overview">The Property</a>{hasGallery&&<a href="#gallery">Gallery</a>}{p.facts.existing_structures&&<a href="#structures">Existing Structures</a>}{hasArea&&<a href="#area">The Area</a>}{infrastructure.some(k=>p.facts[k])&&<a href="#infrastructure">Site & Infrastructure</a>}{p.phases.length>0&&<a href="#next">Now and Next</a>}</nav>
  <div className="property-content">
   <section id="overview" className={'property-overview'+(!showInterest?' property-overview-connected':'')}><div><h2>{p.headline}</h2>{(p.region||p.facts.total_acres)&&<p className="property-subtitle">{[p.region,p.facts.total_acres?`${formatFact(p.facts.total_acres)} acres`:''].filter(Boolean).join(' · ')}</p>}<div className="cms-prose">{p.intro.split('\n').filter(Boolean).map((v,i)=><p key={i}>{v}</p>)}</div></div>{showInterest&&<aside className="property-interest"><h3>Interested in {p.name}?</h3><dl className="property-key-facts">{facts(summaryKeys)}</dl>{(property.offeringStatus||property.status)&&<span className="property-status">{propertyStatus(p)}</span>}<a className="button" href="/signin">Get involved</a></aside>}</section>
   <PropertyGallery property={p}/>
   {p.facts.existing_structures&&<section id="structures" className="property-block property-structures"><h2>Existing Structures</h2><dl>{facts(['existing_structures'])}</dl></section>}
   {hasArea&&<PropertyMap property={p}/>}
   {(remaining.length>0||p.facts.season_notes||p.facts.recreation||p.facts.nearby_attractions)&&<section className="property-block"><h2>Area Details</h2><dl className="property-area-facts">{facts(['season_notes','recreation','nearby_attractions'])}{facts(remaining)}</dl></section>}
   <PropertyInfrastructure property={p}/>
   {p.phases.length>0&&<section id="next" className="property-block"><h2>Now and Next</h2><div className="property-phases">{p.phases.map(v=><article key={v.id}><h3>{v.name}</h3>{hasPublicValue(v.scope)&&<p>{v.scope}</p>}{(hasPublicFact(v.budget)||hasPublicFact(v.timeline))&&<dl>{hasPublicFact(v.budget)&&<div><dt>Budget</dt><dd>{formatFact(v.budget,p.currency,true)}</dd></div>}{hasPublicFact(v.timeline)&&<div><dt>Timeline</dt><dd>{formatFact(v.timeline)}</dd></div>}</dl>}</article>)}</div></section>}
   {p.media.some(v=>v.kind!=='image'||(v.role!=='aerial'&&v.role!=='site_plan'&&v.role!=='gallery'))&&<section className="property-block"><h2>Plans & Media</h2><div className="property-media">{p.media.filter(v=>v.kind!=='image'||(v.role!=='aerial'&&v.role!=='site_plan'&&v.role!=='gallery')).map(v=><figure key={v.id}>{v.kind==='image'?<a href={v.url} target="_blank" rel="noreferrer"><img src={photoThumbnailUrl(v.url)} alt={v.alt} loading="lazy" decoding="async"/></a>:v.kind==='video'?<video controls preload="metadata" src={v.url} aria-label={v.alt}/>:<a href={v.url} target="_blank" rel="noreferrer">{v.alt}</a>}<figcaption>{v.caption} · {v.role.replaceAll('_',' ')} · {v.state==='Not yet determined'?'':v.state}</figcaption></figure>)}</div></section>}
   {p.sections.map(s=><section className="property-block property-story" key={s.id} id={'story-'+s.id}><div><h2>{s.title}</h2>{s.body.split('\n').filter(Boolean).map((v,i)=><p key={i}>{v}</p>)}</div>{s.facts.length>0&&<dl>{s.facts.map((f,i)=><div key={i}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}</section>)}
  </div>
 </Container></>;
}
