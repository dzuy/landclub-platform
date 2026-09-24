'use client';
import {useActionState} from 'react';
import {sendInvitation} from './actions';
import {roleLabels,roleValues} from '@/lib/roles';
import type {Invitation} from '@/lib/invitations';
import styles from './invitations.module.css';

export function InvitationManager({invitations}:{invitations:Invitation[]}){
 const [state,action,pending]=useActionState(sendInvitation,{error:''});
 return <div className={`dashboard-grid ${styles.grid}`}><section className="panel"><span className="eyebrow">INVITE A USER</span><h2>Bring someone into the club.</h2><p>They’ll receive a single-use Land Club email at this exact address and choose their password after opening the link.</p><form action={action} className="form"><label>Email address<input type="email" name="email" autoComplete="off" required maxLength={254}/></label><fieldset className={styles.rolePicker}><legend>Roles</legend><p className="muted">Choose any that apply. If none are selected, Member is assigned.</p>{roleValues.map(role=><label className="check" key={role}><input type="checkbox" name="roles" value={role} defaultChecked={role==='member'}/>{roleLabels[role]}</label>)}</fieldset>{state.error&&<p className="cms-error" role="alert">{state.error}</p>}{state.message&&<p className="cms-success" role="status">{state.message}</p>}<button disabled={pending}>{pending?'Sending invitation…':'Send invitation'}</button></form></section><section><span className="eyebrow">RECENT INVITATIONS</span><h2>Access in progress.</h2>{invitations.length?invitations.map(item=><article className={styles.invitationRow} key={item.id}><div><strong>{item.email}</strong><p>{item.roles.map(role=>roleLabels[role]).join(' · ')}</p><small>{new Date(item.createdAt).toLocaleDateString()}</small></div><span className={`badge ${item.status==='failed'?styles.failed:''}`}>{item.status}</span></article>):<p className="empty">No invitations have been sent yet.</p>}</section></div>;
}
