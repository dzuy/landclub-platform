'use client';
import {useRef,useState} from 'react';
import {MAX_PHOTO_BYTES,PHOTO_MIME_TYPES} from '@/lib/photo-policy';
export function EventImageEditor({url,alt,title,disabled=false,onChange,onBusy}:{url:string;alt:string;title:string;disabled?:boolean;onChange:(imageUrl:string,imageAlt:string)=>void;onBusy:(busy:boolean)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[dragging,setDragging]=useState(false);
 const input=useRef<HTMLInputElement>(null),uploading=useRef(false),dragDepth=useRef(0);
 async function upload(file:File){
  if(disabled||uploading.current)return;
  if(!PHOTO_MIME_TYPES.includes(file.type)){setError('Choose a JPG, PNG, WebP or GIF photo.');return;}
  if(file.size>MAX_PHOTO_BYTES){setError('Choose a photo under 20 MiB.');return;}
  uploading.current=true;setBusy(true);onBusy(true);setError('');
  try{const body=new FormData();body.set('file',file);
   const response=await fetch('/api/event-images',{method:'POST',body});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to upload image.');onChange(result.url,alt||title);
  }catch(e){setError(e instanceof Error?e.message:'Unable to upload image.');}finally{uploading.current=false;setBusy(false);onBusy(false);}
 }
 return <section className="event-image-editor" aria-label="Event photo"><h2>Event photo</h2>
 <div className={'event-photo-dropzone'+(dragging?' is-dragging':'')} onDragEnter={e=>{e.preventDefault();dragDepth.current++;if(!disabled&&!busy)setDragging(true);}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect=disabled||busy?'none':'copy';}} onDragLeave={e=>{e.preventDefault();dragDepth.current--;if(dragDepth.current<=0)setDragging(false);}} onDrop={e=>{e.preventDefault();dragDepth.current=0;setDragging(false);if(disabled||busy)return;if(e.dataTransfer.files.length!==1){setError('Drop one photo at a time.');return;}void upload(e.dataTransfer.files[0]);}}>
 {url&&<img className="event-cover" src={url} alt={alt||title} draggable={false}/>}
 <div className="event-photo-drop-actions"><p>{dragging?'Drop your photo here':url?'Drag a photo here to replace it':'Drag and drop an event photo here'}</p><button type="button" className="secondary" disabled={disabled||busy} onClick={()=>input.current?.click()}>{url?'Replace photo':'Upload photo'}</button></div>
 </div>
 <input ref={input} type="file" hidden aria-label="Choose event photo" accept="image/jpeg,image/png,image/webp,image/gif" disabled={disabled||busy} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/>
 <p className="muted">JPG, PNG, WebP or GIF · Up to 20 MiB</p>
 {url&&<><div className="row-actions"><button type="button" className="secondary" disabled={disabled||busy} onClick={()=>{setError('');onChange('','');}}>Remove photo</button></div><label>Image description<input value={alt} maxLength={300} disabled={disabled||busy} onChange={e=>onChange(url,e.target.value)}/></label></>}
 <p className="muted">Save the event to apply photo changes.</p>
 {busy&&<p role="status">Uploading…</p>}{error&&<p role="alert" className="cms-error">{error}</p>}
 </section>;
}
