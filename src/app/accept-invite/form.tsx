'use client';
import {useActionState} from 'react';
import {acceptInvitation} from './actions';

export function AcceptInvitationForm(){const [state,action,pending]=useActionState(acceptInvitation,{error:''});return <form action={action} className="form"><label>Create password<input type="password" name="password" autoComplete="new-password" required minLength={8} maxLength={1024} autoFocus/></label><label>Confirm password<input type="password" name="confirmPassword" autoComplete="new-password" required minLength={8} maxLength={1024}/></label><p className="muted">Use at least 8 characters.</p>{state.error&&<p className="cms-error" role="alert">{state.error}</p>}<button disabled={pending}>{pending?'Creating account…':'Create my account'}</button></form>}
