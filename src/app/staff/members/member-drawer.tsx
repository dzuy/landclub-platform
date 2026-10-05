'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import type {MemberDetail} from '@/lib/member-detail';
import {getMemberDetail} from './[id]/actions';
import {MemberDetailContent} from './member-detail-content';
import styles from './members.module.css';
export function MemberDrawerLink({id,name}:{id:string;name:string}){
 const [open,setOpen]=useState(false),[detail,setDetail]=useState<MemberDetail|null>(null),[error,setError]=useState('');
 const [closing,setClosing]=useState(false),[savingClose,setSavingClose]=useState(false);const outsidePress=useRef(false),closePending=useRef(false),saveBeforeClose=useRef<(()=>Promise<boolean>)|null>(null);
 const trigger=useRef<HTMLButtonElement>(null);const dialog=useRef<HTMLDialogElement>(null);const router=useRouter();
 useEffect(()=>{if(!open)return;const modal=dialog.current!;modal.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';let active=true;setDetail(null);setError('');getMemberDetail(id).then(result=>{if(!active)return;if(result.detail)setDetail(result.detail);else setError(result.error||'Unable to load member.');}).catch(()=>{if(active)setError('Unable to connect. Close the drawer and try again.');});return()=>{active=false;document.body.style.overflow=overflow;modal.close();};},[open,id]);
 useEffect(()=>{if(!closing)return;const timeout=window.setTimeout(()=>{dialog.current?.close();setOpen(false);setClosing(false);trigger.current?.focus();router.refresh();},window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:220);return()=>window.clearTimeout(timeout);},[closing,router]);
 async function close(){if(closePending.current)return;closePending.current=true;setSavingClose(true);try{if(saveBeforeClose.current&&!await saveBeforeClose.current())return;setClosing(true);}finally{closePending.current=false;setSavingClose(false);}}
 function isOutside(event:React.MouseEvent<HTMLDialogElement>|React.PointerEvent<HTMLDialogElement>){const bounds=event.currentTarget.getBoundingClientRect();return event.target===event.currentTarget&&(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom);}
 return <><button ref={trigger} data-member-drawer-trigger type="button" className={styles.memberLink} onClick={()=>setOpen(true)}>{name}</button>{open&&<dialog ref={dialog} className={`member-drawer${closing?' is-closing':''}`} onPointerDown={event=>{outsidePress.current=isOutside(event);}} onPointerCancel={()=>{outsidePress.current=false;}} onClick={event=>{if(outsidePress.current&&isOutside(event))close();outsidePress.current=false;}} aria-labelledby={`member-drawer-title-${id}`} onCancel={e=>{e.preventDefault();close();}}><header className="member-drawer-heading"><div><h1 id={`member-drawer-title-${id}`}>{name}</h1></div><button type="button" className="secondary" aria-label={savingClose?"Saving before closing":"Close member details"} disabled={savingClose||closing} autoFocus onClick={close}>×</button></header><div className="member-drawer-body">{!detail&&!error&&<p role="status">Loading member details…</p>}{error&&<p role="alert" className="cms-error">{error}</p>}{detail&&<MemberDetailContent detail={detail} onSaveBeforeClose={save=>{saveBeforeClose.current=save;}}/>}</div></dialog>}</>;
}
