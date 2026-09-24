'use client';
import {useState,useTransition} from 'react';
import {type Profile} from '@/lib/profile';
import {saveProfile} from './actions';

export function ProfileForm({initial,email}:{initial:Profile;email:string}){
 const [profile,setProfile]=useState(initial);
 const [saved,setSaved]=useState(initial);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [pending,startTransition]=useTransition();
 const dirty=JSON.stringify(profile)!==JSON.stringify(saved);
 function change<K extends keyof Profile>(key:K,value:Profile[K]){setProfile(p=>({...p,[key]:value}));setMessage('');setError('');}
 return <form className="form dashboard-form" onSubmit={event=>{
  event.preventDefault();setError('');setMessage('');
  startTransition(async()=>{try{const result=await saveProfile(profile);if(result.error)setError(result.error);else if(result.saved){setProfile(result.saved);setSaved(result.saved);setMessage('Your profile and preferences are saved.');}}catch{setError('Unable to connect. Your changes have not been saved. Please try again.');}});
 }}>
 <fieldset className="profile-fields" disabled={pending}>
 <label>Your name<input name="displayName" autoComplete="name" required maxLength={100} value={profile.displayName} onChange={e=>change('displayName',e.target.value)}/></label>
 <div className="profile-email"><span>Account email</span><p aria-describedby="profile-email-help">{email}</p></div>
 <p id="profile-email-help" className="muted">Your verified sign-in email. Contact your administrator if it needs to change.</p>
 <label>Home region<input name="homeRegion" autoComplete="address-level1" maxLength={100} value={profile.homeRegion} onChange={e=>change('homeRegion',e.target.value)} placeholder="e.g. Pacific Northwest"/></label>
 <fieldset><legend>Communication preferences</legend>
 <label className="check"><input type="checkbox" checked={profile.propertyUpdates} onChange={e=>change('propertyUpdates',e.target.checked)}/>Property news and planning updates</label>
 <label className="check"><input type="checkbox" checked={profile.clubEvents} onChange={e=>change('clubEvents',e.target.checked)}/>Club gatherings and events</label>
 <label className="check"><input type="checkbox" checked={profile.newPlaces} onChange={e=>change('newPlaces',e.target.checked)}/>New places to explore</label>
 </fieldset>
 <p className="muted">We’ll save your choices to your account. Automated email updates aren’t available yet.</p>
 </fieldset>
 <div className="row-actions"><button disabled={pending||!dirty}>{pending?'Saving…':'Save changes'}</button><button type="button" className="secondary" disabled={pending||!dirty} onClick={()=>{setProfile(saved);setError('');setMessage('Unsaved changes discarded.');}}>Cancel changes</button></div>
 {error&&<p role="alert" className="cms-error">{error}</p>}
 <p role="status" aria-live="polite" className={message?'cms-success':'muted'}>{message|| (dirty?'You have unsaved changes.':'')}</p>
 </form>;
}
