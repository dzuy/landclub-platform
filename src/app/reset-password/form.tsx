'use client';
import {useActionState} from 'react';
import {updatePassword} from './actions';

export function ResetPasswordForm(){
 const [state,action,pending]=useActionState(updatePassword,{error:''});
 return <form action={action} className="form">
  <label>New password<input type="password" name="password" autoComplete="new-password" required minLength={8} maxLength={1024} autoFocus/></label>
  <label>Confirm new password<input type="password" name="confirmPassword" autoComplete="new-password" required minLength={8} maxLength={1024}/></label>
  <p className="muted">Use at least 8 characters.</p>
  {state.error&&<p className="cms-error" role="alert">{state.error}</p>}
  <button disabled={pending}>{pending?'Updating password…':'Set new password'}</button>
 </form>;
}
