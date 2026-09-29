'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import type {MemberDetail} from '@/lib/member-detail';
import {getMemberDetail} from './[id]/actions';
import {MemberDetailContent} from './member-detail-content';
import styles from './members.module.css';
export function MemberDrawerLink({id,name}:{id:string;name:string}){
 const [open,setOpen]=useState(false),[detail,setDetail]=useState<MemberDetail|null>(null),[error,setError]=useState('');
 const trigger=useRef<HTMLButtonElement>(null);const dialog=useRef<HTMLDialogElement>(null);const router=useRouter();
 useEffect(()=>{if(!open)return;const modal=dialog.current!;modal.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';let active=true;setDetail(null);setError('');getMemberDetail(id).then(result=>{if(!active)return;if(result.detail)setDetail(result.detail);else setError(result.error||'Unable to load member.');}).catch(()=>{if(active)setError('Unable to connect. Close the drawer and try again.');});return()=>{active=false;document.body.style.overflow=overflow;modal.close();};},[open,id]);
 function close(){dialog.current?.close();setOpen(false);trigger.current?.focus();router.refresh();}
 return <><button ref={trigger} type="button" className={styles.memberLink} onClick={()=>setOpen(true)}>{name}</button>{open&&<dialog ref={dialog} className="member-drawer" aria-labelledby={`member-drawer-title-${id}`} onCancel={e=>{e.preventDefault();close();}}><header className="member-drawer-heading"><div><div className="eyebrow">ADMIN TOOLS / MEMBER DETAILS</div><h1 id={`member-drawer-title-${id}`}>{name}</h1></div><button type="button" className="secondary" aria-label="Close member details" autoFocus onClick={close}>×</button></header><div className="member-drawer-body">{!detail&&!error&&<p role="status">Loading member details…</p>}{error&&<p role="alert" className="cms-error">{error}</p>}{detail&&<MemberDetailContent detail={detail}/>}</div></dialog>}</>;
}
