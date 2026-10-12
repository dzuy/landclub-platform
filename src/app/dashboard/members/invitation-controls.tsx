'use client';
import {useActionState,useState} from 'react';
import {cancelInvitation,resendInvitation} from './actions';
import styles from './members.module.css';

export function InvitationControls({id,email,sentAt}:{id:string;email:string;sentAt:string|null}){
 const [confirming,setConfirming]=useState(false);
 const [resent,resend,resending]=useActionState(resendInvitation,{error:'',message:''});
 const [cancelled,cancel,cancelling]=useActionState(cancelInvitation,{error:'',message:''});
 const busy=resending||cancelling;
 if(cancelled.message)return <p role="status" className="cms-success">{cancelled.message}</p>;
 return <div className={styles.memberInvite}>
 {sentAt&&!resent.message&&<p className="muted">Last sent: {new Date(sentAt).toLocaleString()}</p>}
 <div className="row-actions">
 <form action={resend}><input type="hidden" name="invitationId" value={id}/><button className="secondary" disabled={busy||!!resent.message||confirming}>{resending?'Resending…':'Resend invite'}</button></form>
 {!confirming&&<button type="button" className={styles.dangerButton} disabled={busy} onClick={()=>setConfirming(true)}>Cancel invite</button>}
 </div>
 {confirming&&<div className={styles.cancelInvite}><p>Cancel the invitation for {email}? Their current invite will stop working. Saved member setup will return to a draft.</p><div className="row-actions"><form action={cancel}><input type="hidden" name="invitationId" value={id}/><button className={styles.dangerButton} disabled={busy}>{cancelling?'Cancelling…':'Yes, cancel invite'}</button></form><button type="button" className="secondary" disabled={busy} onClick={()=>setConfirming(false)}>Keep invite</button></div></div>}
 {(resent.error||cancelled.error)&&<p role="alert" className="cms-error">{cancelled.error||resent.error}</p>}
 {resent.message&&<p role="status" className="cms-success">{resent.message}</p>}
 </div>;
}
