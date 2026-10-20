'use client';
import {useEffect,useRef,useState,useSyncExternalStore,useTransition} from 'react';
import {useDetailSaveStatus} from './detail-save-status';
import {useRouter} from 'next/navigation';
import {type PropertyDraft,type PropertyRecord} from '@/lib/schema';
import {saveProperty,publishProperty,unpublishProperty,deleteProperty} from '@/app/dashboard/properties/actions';
import {TrashIcon} from './trash-icon';
import {PropertyPhotos} from './property-photos';
import {PropertyFactsEditor} from './property-facts-editor';
import {categories} from '@/lib/property-facts';
import {PropertyAutosave} from '@/lib/property-autosave';
type History={id:string;action:string;actor:string;version:number;created_at:string}[];
export function PropertyEditor({initial,history,drawer=false,onDirtyChange,onBusyChange,onSaveBeforeClose}:{initial:PropertyRecord;history:History;drawer?:boolean;onDirtyChange?:(dirty:boolean)=>void;onBusyChange?:(busy:boolean)=>void;onSaveBeforeClose?:(save:(()=>Promise<boolean>)|null)=>void}){
 const [autosave]=useState(()=>new PropertyAutosave(initial,saveProperty));
 const {record,draft,saving,error:saveError}=useSyncExternalStore(autosave.subscribe,autosave.getSnapshot,autosave.getSnapshot);
 const setDraft=(update:(draft:PropertyDraft)=>PropertyDraft)=>autosave.edit(update);
 const [tab,setTab]=useState('Overview'),[feedback,setFeedback]=useState(''),[error,setError]=useState(''),[confirmation,setConfirmation]=useState<'publish'|'unpublish'|'delete'|null>(null),[pending,start]=useTransition();const router=useRouter();
 const [uploading,setUploading]=useState(false);
 const dirty=autosave.dirty;
 useDetailSaveStatus(saveError||error?'error':saving||uploading||pending?'saving':dirty?'unsaved':record.version>initial.version?'saved':'');
 useEffect(()=>{autosave.start();return()=>autosave.stop();},[autosave]);
 useEffect(()=>{onSaveBeforeClose?.(()=>autosave.flush());return()=>onSaveBeforeClose?.(null);},[autosave,onSaveBeforeClose]);
 useEffect(()=>{onDirtyChange?.(dirty);},[dirty,onDirtyChange]);
 useEffect(()=>{onBusyChange?.(pending||uploading);},[pending,uploading,onBusyChange]);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(confirmation)dialog.current?.showModal();else dialog.current?.close();},[confirmation]);
 useEffect(()=>{function guard(e:BeforeUnloadEvent){if(autosave.dirty||autosave.getSnapshot().saving){e.preventDefault();e.returnValue='';}}window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[autosave]);
 useEffect(()=>{
  function navigate(event:MouseEvent){
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||(!autosave.dirty&&!autosave.getSnapshot().saving))return;
   const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href]'):null;
   if(!link||link.download||(link.target&&link.target!=='_self'))return;
   const url=new URL(link.href,location.href);if(!['http:','https:'].includes(url.protocol))return;
   if(url.pathname===location.pathname&&url.search===location.search&&url.hash)return;
   event.preventDefault();event.stopPropagation();
   void autosave.flush().then(saved=>{if(saved){if(url.origin===location.origin)router.push(url.pathname+url.search+url.hash);else location.assign(url.href);}});
  }
  document.addEventListener('click',navigate,true);return()=>document.removeEventListener('click',navigate,true);
 },[autosave,router]);
 const set=<K extends keyof PropertyDraft>(key:K,value:PropertyDraft[K])=>{setDraft(p=>({...p,[key]:value}));setFeedback('');};
 const field=(label:string,key:'name'|'slug'|'region'|'status'|'headline'|'summary'|'intro'|'imageAlt',multiline=false)=><label>{label}{multiline?<textarea value={draft[key]} rows={key==='intro'?6:3} onChange={e=>set(key,e.target.value)}/>:<input value={draft[key]} onChange={e=>set(key,e.target.value)}/>}</label>;
 function remove(){start(async()=>{
  setError('');
  if(!await autosave.flush())return;
  autosave.setPaused(true);
  try{
   const current=autosave.getSnapshot().record;
   const result=await deleteProperty(current.id,current.version,'DELETE');
   if(!result.ok){setError(result.error);return;}
   autosave.stop();window.location.assign('/dashboard/properties');
  }catch{setError('The property could not be deleted. Please try again.');}
  finally{autosave.setPaused(false);}
 });}
 function run(action:'publish'|'unpublish'){start(async()=>{
  setError('');setFeedback('');if(!await autosave.flush())return;
  autosave.setPaused(true);
  try{const current=autosave.getSnapshot().record;const result=action==='publish'?await publishProperty(current.id,current.version):await unpublishProperty(current.id,current.version);
   if(!result.ok){setError(result.error);return;}autosave.accept(result.record);setConfirmation(null);setFeedback(action==='publish'?'Active. Saved edits will now update the live page.':'Draft. The public page is no longer available.');router.refresh();
  }catch{setError('The change could not be completed. Please try again.');}finally{autosave.setPaused(false);}
 });}

 return <>{!drawer&&<div className="heading cms-editor-heading"><h1>{record.draft.name}</h1></div>}
 <div className="cms-toolbar"><div role="tablist" aria-label="Editor sections">{['Overview','Facts','Photos'].map(t=><button key={t} disabled={uploading} role="tab" aria-selected={tab===t} className={tab===t?'active':'secondary'} onClick={()=>setTab(t)}>{t}</button>)}</div><div className="row-actions">{!drawer&&<button type="button" disabled={pending||uploading} onClick={()=>start(async()=>{if(await autosave.flush())router.push('/dashboard/properties');})}>Save and Exit</button>}{!drawer&&<span className="cms-save-state" role="status" aria-live="polite">{saveError?'Changes not saved':saving?'Saving…':dirty?'Waiting to save…':'All changes saved'}</span>}{saveError&&<button className="secondary" disabled={saving||uploading||pending} onClick={()=>void autosave.flush()}>Retry save</button>}<button className={record.published?'property-danger':'secondary'} disabled={pending||uploading||dirty||saving} onClick={()=>setConfirmation(record.published?'unpublish':'publish')}>{record.published?'Move to draft':'Activate'}</button><button type="button" className="trash-button" title="Delete property" aria-label="Delete property" disabled={pending||uploading||saving} onClick={()=>{setError('');setConfirmation('delete');}}><TrashIcon/></button></div></div>
 {feedback&&<div role="status" className="cms-success">{feedback}</div>}{(saveError||error)&&<div role="alert" className="cms-error">{saveError||error}</div>}
 <fieldset className={`cms-fields property-editor-fields${tab==='Photos'?' property-editor-fields--photos':''}`} disabled={pending||uploading}>
 {tab==='Overview'&&<div className="cms-form-grid"><section className="form"><h2>Property Overview</h2>{field('Property name','name')}{field(`Page address (/properties/${draft.slug})`,'slug')}{field('Region','region')}<label>Landscape<select value={draft.category} onChange={e=>set('category',e.target.value as PropertyDraft['category'])}>{categories.map(c=><option key={c}>{c}</option>)}</select></label></section><section className="form property-opening-story"><h2>Opening Story</h2>{field('Hero headline','headline')}{field('Short description','summary',true)}{field('Introduction','intro',true)}</section></div>}
 {tab==='Facts'&&<PropertyFactsEditor draft={draft} onChange={patch=>{setDraft(p=>({...p,...patch}));setFeedback('');}}/>}
 {tab==='Photos'&&<PropertyPhotos propertyId={record.id} onUploadingChange={value=>{autosave.setPaused(value);setUploading(value);}} draft={draft} onChange={patch=>{setDraft(current=>({...current,...patch}));setFeedback('');}}/>}
 </fieldset>
 {confirmation&&confirmation!=='delete'&&<dialog ref={dialog} className="cms-confirm" aria-labelledby="confirm-title" onCancel={()=>setConfirmation(null)}><h2 id="confirm-title">{confirmation==='publish'?'Activate this property?':'Move this property to draft?'}</h2><p>{confirmation==='publish'?'This property will become visible on the site. Future saved edits will update the live version automatically.':'The public page will no longer be available. Your draft and change history will be preserved.'}</p><div className="row-actions"><button autoFocus disabled={pending||uploading} className="secondary" onClick={()=>setConfirmation(null)}>Cancel</button><button className={confirmation==='unpublish'?'property-danger':undefined} disabled={pending||uploading} onClick={()=>run(confirmation)}>{pending?'Working…':confirmation==='publish'?'Activate property':'Move to draft'}</button></div></dialog>}
 {confirmation==='delete'&&<dialog ref={dialog} className="cms-confirm" aria-labelledby="delete-property-title" onCancel={event=>{if(pending)event.preventDefault();else setConfirmation(null);}}><h2 id="delete-property-title">Delete {record.draft.name}?</h2><p>This permanently deletes the property, its saved details, photo records, edit history, and member connections. It will disappear from the site. This cannot be undone.</p>{(error||saveError)&&<p className="cms-error" role="alert">{error||saveError}</p>}<div className="row-actions"><button type="button" autoFocus className="secondary" disabled={pending} onClick={()=>setConfirmation(null)}>Cancel</button><button type="button" className="property-danger" disabled={pending||uploading} onClick={remove}>{pending?'Deleting…':'Delete property'}</button></div></dialog>}
 </>;
}
