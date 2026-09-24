'use client';
import {useActionState,useState} from 'react';
import {signIn} from './actions';
export function SignInForm(){
 const [mode,setMode]=useState<'signin'|'signup'>('signin');
 return <><div className="auth-tabs"><button type="button" className={mode==='signin'?'':'secondary'} aria-pressed={mode==='signin'} onClick={()=>setMode('signin')}>Sign in</button><button type="button" className={mode==='signup'?'':'secondary'} aria-pressed={mode==='signup'} onClick={()=>setMode('signup')}>Create account</button></div>{mode==='signin'?<CredentialsForm/>:<section className="panel"><span className="eyebrow">BY INVITATION</span><h2>Your next chapter starts here.</h2><p>Land Club accounts are currently invitation-only. Please contact your Land Club representative to have an account created for you.</p><p className="muted">Property memberships and staff access are assigned separately. If your account is already set up, you can sign in below.</p><button className="secondary" onClick={()=>setMode('signin')}>I already have an account</button></section>}</>;
}
function CredentialsForm(){const [state,action,pending]=useActionState(signIn,{error:''});return <form action={action} className="form"><label>Email<input type="email" name="email" autoComplete="username" required maxLength={254}/></label><label>Password<input type="password" name="password" autoComplete="current-password" required maxLength={1024}/></label>{state.error&&<p className="cms-error" role="alert">{state.error}</p>}<button disabled={pending}>{pending?'Signing in…':'Sign in to Land Club'}</button></form>}
