'use client';

import {useActionState} from 'react';
import {confirmInvitation} from './actions';

export function ConfirmInvitationForm({tokenHash}:{tokenHash:string}){
 const [state,action,pending]=useActionState(confirmInvitation,{error:''});
 return <form action={action} className="form">
  <input type="hidden" name="token_hash" value={tokenHash}/>
  <input type="hidden" name="type" value="invite"/>
  {state.error&&<p className="cms-error" role="alert">{state.error}</p>}
  <button disabled={pending}>{pending?'Checking invitation…':'Accept invitation'}</button>
 </form>;
}
