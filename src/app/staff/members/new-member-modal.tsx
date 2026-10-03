'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {InvitationForm} from './invitation-form';
import styles from './members.module.css';

export function NewMemberModal(){
 const [open,setOpen]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const outsidePress=useRef(false);const router=useRouter();
 useEffect(()=>{
  if(!open)return;
  const modal=dialog.current!;modal.showModal();
  modal.querySelector<HTMLInputElement>('input[name="displayName"]')?.focus();
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{modal.close();document.body.style.overflow=overflow;};
 },[open]);
 function close(){dialog.current?.close();setOpen(false);trigger.current?.focus();router.refresh();}
 function outside(event:React.PointerEvent<HTMLDialogElement>|React.MouseEvent<HTMLDialogElement>){
  const bounds=event.currentTarget.getBoundingClientRect();
  return event.target===event.currentTarget&&(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom);
 }
 return <><button ref={trigger} type="button" onClick={()=>setOpen(true)}>+ Create a New Member</button>
  {open&&<dialog ref={dialog} className={styles.newMemberModal} aria-labelledby="new-member-title" onCancel={event=>{event.preventDefault();close();}} onPointerDown={event=>{outsidePress.current=outside(event);}} onPointerCancel={()=>{outsidePress.current=false;}} onClick={event=>{if(outsidePress.current&&outside(event))close();outsidePress.current=false;}}>
   <button type="button" className={`secondary ${styles.modalClose}`} aria-label="Close new member setup" onClick={close}>×</button>
   <InvitationForm/>
  </dialog>}
 </>;
}
