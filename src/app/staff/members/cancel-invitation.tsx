'use client';
import {useActionState,useState} from 'react';
import {cancelInvitation} from './actions';
import styles from './members.module.css';

export function CancelInvitation({id,email}:{id:string;email:string}){
 const [confirming,setConfirming]=useState(false);
 const [state,action,pending]=useActionState(cancelInvitation,{error:'',message:''});
 if(!confirming&&!state.message)return <button type="button" className={`secondary ${styles.cancelButton}`} onClick={()=>setConfirming(true)}>Cancel invite</button>;
 return <div className={styles.cancelInvite}>
  {state.message?<span className={styles.roleSuccess} role="status">{state.message}</span>:<>
   <span>Cancel the invitation for {email}?</span>
   <form action={action}><input type="hidden" name="invitationId" value={id}/><button type="submit" className={styles.dangerButton} disabled={pending}>{pending?'Cancelling…':'Yes, cancel'}</button></form>
   <button type="button" className="secondary" disabled={pending} onClick={()=>setConfirming(false)}>Keep invite</button>
   {state.error&&<span className={styles.roleError} role="alert">{state.error}</span>}
  </>}
 </div>;
}
