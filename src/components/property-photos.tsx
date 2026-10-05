'use client';
import {useEffect,useRef,useState} from 'react';
import {MAX_PHOTO_BYTES,PHOTO_SIZE_LABEL} from '@/lib/photo-policy';
import type {PropertyDraft} from '@/lib/schema';
import {DataTable,type TableColumn} from './data-table';
type Photo={src:string;alt:string};
type Entry={isFile:boolean;isDirectory:boolean;file:(ok:(f:File)=>void,fail:(e:unknown)=>void)=>void;createReader:()=>{readEntries:(ok:(entries:Entry[])=>void,fail:(e:unknown)=>void)=>void}};
async function readEntry(entry:Entry):Promise<File[]>{
 if(entry.isFile)return [await new Promise<File>((ok,fail)=>entry.file(ok,fail))];
 if(!entry.isDirectory)return [];
 const reader=entry.createReader(),files:File[]=[];
 for(;;){const entries=await new Promise<Entry[]>((ok,fail)=>reader.readEntries(ok,fail));if(!entries.length)break;for(const child of entries)files.push(...await readEntry(child));}return files;
}
const columns:TableColumn<'photo'|'name'|'cover'|'actions'>[]=[{key:'photo',label:'Photo',width:90,min:80,sortable:false},{key:'name',label:'Name',width:290,min:120},{key:'cover',label:'Cover',width:130,min:90},{key:'actions',label:'Actions',width:90,min:80,sortable:false}];
export function PropertyPhotos({propertyId,draft,onChange,onUploadingChange}:{propertyId:string;draft:PropertyDraft;onChange:(patch:Partial<PropertyDraft>)=>void;onUploadingChange?:(value:boolean)=>void}){
 const [menu,setMenu]=useState<string|null>(null),[view,setView]=useState<'grid'|'table'>('grid'),[dragging,setDragging]=useState(false),[uploading,setUploading]=useState(false),[message,setMessage]=useState('');
 const [sort,setSort]=useState<{column:typeof columns[number]['key'];direction:'asc'|'desc'}>({column:'name',direction:'asc'});
 const container=useRef<HTMLElement>(null),filesInput=useRef<HTMLInputElement>(null),folderInput=useRef<HTMLInputElement>(null),lock=useRef(false),latest=useRef(draft);latest.current=draft;
 const photos:Photo[]=[...(draft.hero?[{src:draft.hero,alt:draft.imageAlt}]:[]),...draft.gallery,...draft.media.filter(m=>m.kind==='image').map(m=>({src:m.url,alt:m.alt}))].filter((p,index,all)=>p.src&&all.findIndex(other=>other.src===p.src)===index);
 useEffect(()=>{if(!menu)return;function dismiss(event:PointerEvent){if(!(event.target instanceof Element)||!event.target.closest('[data-photo-menu]'))setMenu(null);}function escape(event:KeyboardEvent){if(event.key==='Escape'){container.current?.querySelector<HTMLButtonElement>('[aria-expanded="true"]')?.focus();setMenu(null);}}document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};},[menu]);
 async function upload(files:File[]){
  if(lock.current)return;lock.current=true;setUploading(true);onUploadingChange?.(true);setMenu(null);
  let added=0;const errors:string[]=[];
  try{
   for(const [index,file] of files.entries()){
    setMessage(`Uploading ${index+1} of ${files.length}…`);
    if(!/\.(jpe?g|png|webp|gif)$/i.test(file.name)||file.size>MAX_PHOTO_BYTES){errors.push(`${file.name}: unsupported format or over ${PHOTO_SIZE_LABEL}`);continue;}
    const form=new FormData();form.set('propertyId',propertyId);form.set('file',file);
    try{const response=await fetch('/api/property-photos',{method:'POST',body:form});const result=await response.json();if(!response.ok)throw new Error(result.error||'Upload failed');
     const current=latest.current;const media=[...current.media,{id:result.id,role:'gallery' as const,kind:'image' as const,url:result.url,alt:file.name.slice(0,300),caption:'',state:'Actual' as const}];
     latest.current={...current,media};onChange({media});added++;
    }catch(error){errors.push(`${file.name}: ${error instanceof Error?error.message:'Upload failed'}`);}
   }
   setMessage(`${added} photo${added===1?'':'s'} uploaded.${errors.length?' '+errors.join('; '):''}`);
  }finally{lock.current=false;setUploading(false);onUploadingChange?.(false);}
 }
 function cover(photo:Photo){
  const gallery=draft.hero&&!draft.gallery.some(p=>p.src===draft.hero)&&!draft.media.some(p=>p.url===draft.hero)&&draft.gallery.length<20?[...draft.gallery,{src:draft.hero,alt:draft.imageAlt||draft.name||'Property image',caption:'',type:'Current property' as const}]:draft.gallery;
  onChange({hero:photo.src,imageAlt:photo.alt||draft.name||'Property image',gallery});setMenu(null);
 }
 function options(photo:Photo,index:number){return <div className="property-photo-menu" data-photo-menu><button type="button" className="property-photo-more" aria-label={`Photo ${index+1} options`} aria-expanded={menu===photo.src} onClick={()=>setMenu(menu===photo.src?null:photo.src)}>⋯</button>{menu===photo.src&&<div className="property-photo-menu-panel"><button type="button" disabled={draft.hero===photo.src} onClick={()=>cover(photo)}>Use as Cover Image</button></div>}</div>;}
 const sorted=[...photos].sort((a,b)=>{const order=sort.column==='cover'?Number(b.src===draft.hero)-Number(a.src===draft.hero):a.alt.localeCompare(b.alt);return sort.direction==='asc'?order:-order;});
 return <section ref={container}><div className="property-photos-heading"><h2>Photos</h2><div className="row-actions" aria-label="Photo view"><button type="button" className="secondary" aria-label="Grid view" title="Grid view" aria-pressed={view==='grid'} onClick={()=>{setView('grid');setMenu(null);}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></button><button type="button" className="secondary" aria-label="Table view" title="Table view" aria-pressed={view==='table'} onClick={()=>{setView('table');setMenu(null);}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 3v18"/></svg></button></div></div>
  <div className={`property-photo-dropzone${dragging?' is-dragging':''}`} onDragOver={event=>{event.preventDefault();if(!uploading)setDragging(true);}} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDragging(false);}} onDrop={async event=>{event.preventDefault();setDragging(false);if(lock.current)return;const items=Array.from(event.dataTransfer.items);const fallback=Array.from(event.dataTransfer.files);const entries=items.map(item=>item.webkitGetAsEntry?.() as unknown as Entry|null).filter((entry):entry is Entry=>!!entry);try{await upload(entries.length?(await Promise.all(entries.map(readEntry))).flat():fallback);}catch{setMessage('Unable to read this folder. Try Choose folder instead.');}}}>
   <p>Drag photos or a folder here</p><div className="row-actions"><button type="button" className="secondary" disabled={uploading} onClick={()=>filesInput.current?.click()}>Choose photos</button><button type="button" className="secondary" disabled={uploading} onClick={()=>folderInput.current?.click()}>Choose folder</button></div><small>JPG, PNG, WebP or GIF · Up to {PHOTO_SIZE_LABEL} per photo</small>
   <input hidden ref={filesInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={event=>{const files=Array.from(event.target.files||[]);event.target.value='';void upload(files);}}/>
   <input hidden ref={folderInput} type="file" multiple {...{webkitdirectory:''}} onChange={event=>{const files=Array.from(event.target.files||[]);event.target.value='';void upload(files);}}/>
  </div>{message&&<p className="property-upload-status" role="status">{message}</p>}
  {!photos.length?<p className="muted">No photos yet.</p>:view==='grid'?<div className="property-photo-grid">{photos.map((photo,index)=><div className="property-photo-tile" key={photo.src}><img src={photo.src} alt={photo.alt||`Property photo ${index+1}`}/>{draft.hero===photo.src&&<span className="property-photo-cover">Cover image</span>}{options(photo,index)}</div>)}</div>:<div className="property-photo-table"><DataTable columns={columns} label="Property photos" sort={sort} onSort={column=>setSort({column,direction:sort.column===column&&sort.direction==='asc'?'desc':'asc'})}>{sorted.map((photo,index)=><tr key={photo.src}><td><img src={photo.src} alt={photo.alt}/></td><td>{photo.alt||`Photo ${index+1}`}</td><td>{photo.src===draft.hero?'Cover image':'—'}</td><td>{options(photo,index)}</td></tr>)}</DataTable></div>}
 </section>;
}
