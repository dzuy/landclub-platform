'use client';
import {useActionState,useEffect,useState} from 'react';
import {TrashIcon} from '@/components/trash-icon';
import {deleteMember} from './actions';
import styles from './members.module.css';

export function DeleteMemberControl({id,email,kind='user',disabled=false}:{id:string;email:string;kind?:'user'|'prepared'|'invitation';disabled?:boolean}){
 const [confirming,setConfirming]=useState(false),[confirmation,setConfirmation]=useState('');
 const [state,action,pending]=useActionState(deleteMember,{error:''});
 useEffect(()=>{if(state.deleted)window.location.assign(state.self?'/signin':'/dashboard/members');},[state.deleted,state.self]);
 return <section className={styles.memberInvite} aria-label="Delete user">
 {!confirming?<button type="button" className="trash-button" aria-label="Delete user" title="Delete user" disabled={disabled} onClick={()=>setConfirming(true)}><TrashIcon/></button>:
 <form action={action} className={styles.cancelInvite}>
 <h2>Delete {email}?</h2>
 <p>This permanently deletes their member setup, invitation, sign-in account (if created), roles, property connections, and member documents. Properties and shared documents will remain. This cannot be undone.</p>
 <input type="hidden" name="targetKind" value={kind}/><input type="hidden" name="userId" value={id}/>
 <label>Type DELETE to confirm<input name="confirmation" value={confirmation} onChange={event=>setConfirmation(event.target.value)} autoComplete="off" disabled={pending||state.deleted}/></label>
 <div className="row-actions"><button className={styles.dangerButton} disabled={pending||state.deleted||confirmation!=='DELETE'}>{pending?'Deleting…':'Permanently delete user'}</button><button type="button" className="secondary" disabled={pending||state.deleted} onClick={()=>{setConfirming(false);setConfirmation('');}}>Cancel</button></div>
 {state.error&&<p role="alert" className="cms-error">{state.error}</p>}
 </form>}
 </section>;
}
