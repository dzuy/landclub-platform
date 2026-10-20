import Link from 'next/link';
import {sharingMailReady} from '@/lib/sharing-email';
import {InviteViewer,RevokeViewer} from './forms';
import type {SharingInvitation} from '@/lib/investment-sharing';
type Account={id:string;name:string;holder_name:string};
type SharedReport={id:string;project_name:string;kind:string;title:string};
export function SharingContent({owned,invitations,reports,onBehalf}:{owned:Account[];invitations:SharingInvitation[];reports:SharedReport[];onBehalf?:{person:string;name:string}}){
 const deliveryReady=sharingMailReady(process.env);
 return <div className="sharing-content"><h1>Share investments</h1><p>Give someone read-only access to selected investments.</p>{onBehalf&&<p className="sharing-acting">Acting on behalf of <strong>{onBehalf.name}</strong></p>}
 {owned.length?<InviteViewer accounts={owned} onBehalf={onBehalf} deliveryReady={deliveryReady}/>:<p>No investments available to share.</p>}
 {!deliveryReady&&<p role="status" className="sharing-notice">Invitations are unavailable until email delivery is configured.</p>}
 <p className="sharing-detail">Access includes released reports and their documents. Recipients cannot edit or reshare.</p>
 <div className="sharing-access"><h2>People with access</h2>{invitations.length?<ul className="sharing-access-list">{invitations.map(i=><li key={i.id}><div><strong>{i.email}</strong><span className="sharing-state">{i.status==='accepted'?'Active':i.status==='pending'?'Pending':i.status.charAt(0).toUpperCase()+i.status.slice(1)}</span><p>{i.accounts.join(' · ')}</p>{i.delivery_state==='failed'&&<p role="status">Delivery not confirmed.</p>}</div>{['pending','accepted','failed'].includes(i.status)&&<RevokeViewer id={i.id} email={i.email} accounts={i.accounts} onBehalf={onBehalf}/>}</li>)}</ul>:<p>No one has access yet.</p>}</div>
 {reports.length>0&&<div className="sharing-access"><h2>Shared with you</h2><p className="sharing-detail">View only. These investments cannot be shared onward.</p><ul>{reports.map(r=><li key={r.id}>{onBehalf?<span>{r.project_name} · {r.kind}</span>:<Link href={`/investment-access/reports/${r.id}`}>{r.project_name} · {r.kind}</Link>}</li>)}</ul>{onBehalf&&<p className="sharing-detail">Opening shared reports is unavailable in View As.</p>}</div>}
 </div>;
}
