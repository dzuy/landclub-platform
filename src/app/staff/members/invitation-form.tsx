'use client';
import {useActionState} from 'react';
import {createPreparedMember} from './actions';
import {roleLabels,roleValues} from '@/lib/roles';
import styles from './members.module.css';

export function InvitationForm(){
 const [state,action,pending]=useActionState(createPreparedMember,{error:''});
 return <section className={`panel ${styles.invitePanel}`}><div><h2 id="new-member-title">Set up new member</h2><p>Create their profile, send an invite.</p></div><form action={action} className={`form ${styles.inviteForm}`}><label>Full name<input name="displayName" autoFocus required maxLength={100} autoComplete="off"/></label><label>Email address<input type="email" name="email" autoComplete="off" required maxLength={254}/></label><fieldset className={styles.rolePicker} disabled={pending}><legend>Roles</legend><p className="muted">Choose any that apply. If none are selected, Member is assigned.</p><div className={styles.roleOptions}>{roleValues.map(role=><label className="check" key={role}><input type="checkbox" name="roles" value={role} defaultChecked={role==='member'}/>{roleLabels[role]}</label>)}</div></fieldset>{state.error&&<p className="cms-error" role="alert">{state.error}</p>}{state.message&&<p className="cms-success" role="status">{state.message}</p>}<button disabled={pending}>{pending?'Preparing member…':'Create member draft'}</button></form></section>;
}
