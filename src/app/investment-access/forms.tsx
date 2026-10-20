 'use client';
import {useActionState,useState} from 'react';
import {inviteInvestmentViewer,revokeInvestmentViewer,acceptInvestmentSharing,inviteInvestmentViewerOnBehalf,revokeInvestmentViewerOnBehalf} from './actions';
type OnBehalf={person:string;name:string};
export function InviteViewer({accounts,onBehalf,deliveryReady=true}:{onBehalf?:OnBehalf;deliveryReady?:boolean;accounts:{id:string;name:string;holder_name:string}[]}){
 const [state,action,pending]=useActionState(onBehalf?inviteInvestmentViewerOnBehalf:inviteInvestmentViewer,{error:''});
 const [selected,setSelected]=useState<string[]>([]);
 return <form action={action} className="sharing-form" onSubmit={event=>{
  const form=event.currentTarget,recipient=String(new FormData(form).get('email')||'');
  if(!window.confirm(`Invite ${recipient} to view these investments${onBehalf?` on behalf of ${onBehalf.name}`:''}?\n\n${accounts.filter(a=>selected.includes(a.id)).map(a=>a.name).join('\n')}\n\nRead-only access to released reports and documents.`)){event.preventDefault();return;}
  if(onBehalf)(form.elements.namedItem('confirmed') as HTMLInputElement).value='yes';
 }}>
 {onBehalf&&<><input type="hidden" name="person" value={onBehalf.person}/><input type="hidden" name="confirmed" defaultValue=""/></>}
 <fieldset disabled={pending}><legend>Investments</legend>{accounts.map(a=><label key={a.id} className="sharing-choice"><input type="checkbox" name="positions" value={a.id} checked={selected.includes(a.id)} onChange={e=>setSelected(e.target.checked?[...selected,a.id]:selected.filter(id=>id!==a.id))}/><span>{a.name}</span></label>)}</fieldset>
 <div className="sharing-invite-row"><label>Email<input required type="email" name="email" maxLength={254} placeholder="person@example.com" disabled={pending}/></label><button disabled={pending||!selected.length||!deliveryReady}>{pending?'Sending…':'Invite'}</button></div>
 {state.error&&<p role="alert">{state.error}</p>}{state.message&&<p role="status">{state.message}</p>}
 </form>;
}
export function RevokeViewer({id,email,accounts,onBehalf}:{id:string;email:string;accounts:string[];onBehalf?:OnBehalf}){
 const [state,action,pending]=useActionState(onBehalf?revokeInvestmentViewerOnBehalf:revokeInvestmentViewer,{error:''});
 return <form action={action} onSubmit={event=>{if(!window.confirm(`Revoke ${email}'s access${onBehalf?` on behalf of ${onBehalf.name}`:''}?\n\n${accounts.join('\n')}`)){event.preventDefault();return;}if(onBehalf)(event.currentTarget.elements.namedItem('confirmed') as HTMLInputElement).value='yes';}}>
 <input type="hidden" name="id" value={id}/>{onBehalf&&<><input type="hidden" name="person" value={onBehalf.person}/><input type="hidden" name="confirmed" defaultValue=""/></>}
 <button className="secondary" disabled={pending}>{pending?'Revoking…':'Revoke'}</button>{state.error&&<p role="alert">{state.error}</p>}{state.message&&<p role="status">{state.message}</p>}
 </form>;
}
export function AcceptViewer({token}:{token:string}){const [state,action,pending]=useActionState(acceptInvestmentSharing,{error:''});return <form action={action}><input type="hidden" name="token" value={token}/><button className="button" disabled={pending}>{pending?'Accepting…':'Accept read-only access'}</button><p role="status">{state.error||state.message}</p></form>;}
