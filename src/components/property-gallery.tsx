'use client';

import {useRef, useState} from 'react';
import type {PropertyDraft} from '@/lib/schema';

type GalleryImage = {src:string; alt:string; caption:string; label:string};

export function PropertyGallery({property}:{property:PropertyDraft}) {
 const groups:{name:string;images:GalleryImage[]}[] = [
  {name:'Photos',images:property.gallery.map(image=>({...image,label:image.type}))},
  {name:'Aerial',images:property.media.filter(image=>image.role==='aerial'&&image.kind==='image').map(image=>({src:image.url,alt:image.alt,caption:image.caption,label:image.state}))},
  {name:'Site Plan',images:property.media.filter(image=>image.role==='site_plan'&&image.kind==='image').map(image=>({src:image.url,alt:image.alt,caption:image.caption,label:image.state}))},
 ].filter(group=>group.images.length>0);
 const [selected,setSelected]=useState(groups[0]?.name);
 const [active,setActive]=useState(0);
 const dialog=useRef<HTMLDialogElement>(null);
 const group=groups.find(group=>group.name===selected)||groups[0];
 if(!group)return null;
 const images=group.images;
 const image=images[active]||images[0];
 const open=(index:number)=>{setActive(index);dialog.current?.showModal();};
 const move=(direction:number)=>setActive(index=>(index+direction+images.length)%images.length);
 return <section id="gallery" className="property-block property-gallery-section">
  <div className="property-block-heading"><h2>Gallery</h2><div className="property-pills" aria-label="Gallery categories">{groups.map(group=><button key={group.name} aria-pressed={selected===group.name} onClick={()=>{setSelected(group.name);setActive(0);}}>{group.name}</button>)}</div></div>
  <div className={'property-gallery gallery-count-'+Math.min(images.length,5)}>{images.slice(0,5).map((image,index)=><button className="property-gallery-image" key={image.src+'-'+index} onClick={()=>open(index)} aria-label={'Open image: '+image.alt}><img src={image.src} alt={image.alt} loading="lazy"/>{index===Math.min(images.length,5)-1&&<span className="property-gallery-more">See all {group.name.toLowerCase()}</span>}</button>)}</div>
  <dialog ref={dialog} className="property-lightbox" onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}} onKeyDown={event=>{if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}if(event.key==='ArrowRight'){event.preventDefault();move(1);}}} aria-label={property.name+' gallery'}>
   <div className="property-lightbox-toolbar"><span>{group.name} · {active+1} / {images.length}</span><button onClick={()=>dialog.current?.close()} aria-label="Close gallery" autoFocus>Close ×</button></div>
   <img src={image.src} alt={image.alt}/>
   <div className="property-lightbox-caption"><div><p>{image.caption||image.alt}</p><span>{image.label}</span></div>{images.length>1&&<div className="property-lightbox-controls"><button onClick={()=>move(-1)} aria-label="Previous image">←</button><button onClick={()=>move(1)} aria-label="Next image">→</button></div>}</div>
  </dialog>
 </section>;
}
