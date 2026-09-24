'use client';
import {useActionState} from 'react';
import {signIn} from './actions';
export function SignInForm(){const [state,action,pending]=useActionState(signIn,{error:''});return <form action={action} className="form"><label>Email<input type="email" name="email" autoComplete="username" required maxLength={254}/></label><label>Password<input type="password" name="password" autoComplete="current-password" required maxLength={1024}/></label>{state.error&&<p className="cms-error" role="alert">{state.error}</p>}<button disabled={pending}>{pending?'Signing in…':'Sign in'}</button></form>}
