'use client';
import {useEffect,useRef,useState} from 'react';
import styles from './document-link.module.css';
/** Fetch through the existing private download endpoint; never create public file URLs. */
export function DocumentLink({href,filename,label,className}:{href:string;filename:string;label?:string;className?:string}){
 const viewable=/\.(pdf|png|jpe?g)$/i.test(filename),pdf=/\.pdf$/i.test(filename);
 const [open,setOpen]=useState(false),[page,setPage]=useState(1),[pages,setPages]=useState(1),[retry,setRetry]=useState(0),[status,setStatus]=useState(''),[image,setImage]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),canvas=useRef<HTMLCanvasElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!open)return;const modal=dialog.current!;modal.showModal();return()=>{modal.close();trigger.current?.focus();};},[open]);
 useEffect(()=>{
  if(!open)return;
  const controller=new AbortController();let disposed=false,objectUrl='',destroy:(()=>void)|undefined;
  setStatus('Loading document…');setImage('');
  async function load(){try{
   const response=await fetch(href,{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw new Error(response.status===401||response.status===403||response.status===404?'This document is unavailable or your access has ended.':'Unable to load this document. Please try again.');
   const bytes=new Uint8Array(await response.arrayBuffer());if(disposed)return;
   if(pdf){
    const renderer=await import('pdfjs-dist');if(disposed)return;
    renderer.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
    const task=renderer.getDocument({data:bytes,enableXfa:false,useSystemFonts:true});destroy=()=>{void task.destroy();};
    const doc=await task.promise;if(disposed)return;setPages(doc.numPages);
    const sheet=await doc.getPage(Math.min(page,doc.numPages));if(disposed||!canvas.current)return;
    const size=sheet.getViewport({scale:1}),viewport=sheet.getViewport({scale:Math.min(1.5,4096/size.width,4096/size.height)}),target=canvas.current;
    target.width=viewport.width;target.height=viewport.height;
    await sheet.render({canvas:target,viewport}).promise;
    if(!disposed)setStatus(`Page ${page} of ${doc.numPages}`);
   }else{objectUrl=URL.createObjectURL(new Blob([bytes],{type:/\.png$/i.test(filename)?'image/png':'image/jpeg'}));setImage(objectUrl);}
   if(!disposed&&!pdf)setStatus('');
  }catch(error){if(!disposed)setStatus(error instanceof Error?error.message:'Unable to display this document.');}}
  void load();return()=>{disposed=true;controller.abort();destroy?.();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[open,href,filename,pdf,page,retry]);
 return <><span className={className}>{viewable?<button ref={trigger} type="button" className={styles.link} onClick={()=>{setPage(1);setPages(1);setOpen(true);}}>{label||filename}</button>:<a href={href} download={filename}>{label||filename}</a>}</span>{viewable&&<a className={styles.download} href={href} download={filename} aria-label={`Download ${label||filename}`}>Download</a>}
 {open&&<dialog ref={dialog} className={styles.viewer} aria-label={`View ${label||filename}`} onCancel={e=>{e.preventDefault();e.stopPropagation();setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape')e.stopPropagation();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)setOpen(false);}}}>
  <header><h2>{label||filename}</h2><button type="button" className="secondary" autoFocus onClick={()=>setOpen(false)}>Close document</button></header>
  <div className={styles.controls}><a href={href} download={filename}>Download original</a>{pdf&&<><button type="button" className="secondary" disabled={page<=1||status==='Loading document…'} onClick={()=>setPage(page-1)}>Previous page</button><span>Page {page} of {pages}</span><button type="button" className="secondary" disabled={page>=pages||status==='Loading document…'} onClick={()=>setPage(page+1)}>Next page</button></>}</div>
  <p role="status">{status}</p>{status&&!status.startsWith('Page ')&&status!=='Loading document…'&&<button type="button" onClick={()=>setRetry(retry+1)}>Try again</button>}
  {pdf?<canvas ref={canvas} aria-label={`Page ${page} of ${filename}`} className={status.startsWith('Page ')?styles.canvas:styles.loading}/>:image&&<img className={styles.image} src={image} alt={label||filename} onError={()=>setStatus('Unable to display this image. Download the original or try again.')}/>}
 </dialog>}</>;
}
