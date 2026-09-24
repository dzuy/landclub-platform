'use client';
import {useActionState} from 'react';
import {sendInvitation} from './actions';
import {roleLabels,roleValues} from '@/lib/roles';
import styles from './members.module.css';

export function InvitationForm(){
 const [state,action,pending]=useActionState(sendInvitation,{error:''});
 return <section className={`panel ${styles.invitePanel}`}><div><span className="eyebrow">INVITE A MEMBER</span><h2>Bring someone into the club.</h2><p>They’ll receive a single-use Land Club email at this exact address and choose their password after opening the link.</p></div><form action={action} className={`form ${styles.inviteForm}`}><label>Email address<input type="email" name="email" autoComplete="off" required maxLength={254}/></label><fieldset className={styles.rolePicker}><legend>Roles</legend><p className="muted">Choose any that apply. If none are selected, Member is assigned.</p><div className={styles.roleOptions}>{roleValues.map(role=><label className="check" key={role}><input type="checkbox" name="roles" value={role} defaultChecked={role==='member'}/>{roleLabels[role]}</label>)}</div></fieldset>{state.error&&<p className="cms-error" role="alert">{state.error}</p>}{state.message&&<p className="cms-success" role="status">{state.message}</p>}<button disabled={pending}>{pending?'Sending invitation…':'Send invitation'}</button></form></section>;
}
