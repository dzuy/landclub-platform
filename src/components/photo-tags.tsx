'use client';
import {useState} from 'react';

const suggestions=['Interior','Exterior','Aerial','Landscape','Amenities','Floor plan','Site plan'];
export function PhotoTags({tags,name,onChange}:{tags:string[];name:string;onChange:(tags:string[])=>void}){
 const [input,setInput]=useState('');
 function add(value:string){
  const tag=value.trim();
  if(!tag||tags.length>=12)return;
  if(!tags.some(existing=>existing.toLowerCase()===tag.toLowerCase()))onChange([...tags,tag]);
  setInput('');
 }
 return <div className="property-photo-tags" role="group" aria-label={`Tags for ${name}`}>
  <div className="property-photo-tag-list">{tags.map(tag=><button key={tag} type="button" aria-label={`Remove ${tag} tag from ${name}`} onClick={()=>onChange(tags.filter(value=>value!==tag))}>{tag}<span aria-hidden="true"> ×</span></button>)}</div>
  {tags.length<12&&<><select aria-label={`Add suggested tag to ${name}`} value="" onChange={event=>add(event.target.value)}><option value="">Add tag…</option>{suggestions.filter(tag=>!tags.some(value=>value.toLowerCase()===tag.toLowerCase())).map(tag=><option key={tag}>{tag}</option>)}</select>
  <div className="property-photo-tag-input"><input aria-label={`Custom tag for ${name}`} placeholder="Custom tag" maxLength={40} value={input} onChange={event=>setInput(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();add(input);}}}/><button type="button" className="secondary" disabled={!input.trim()} onClick={()=>add(input)}>Add</button></div></>}
 </div>;
}
