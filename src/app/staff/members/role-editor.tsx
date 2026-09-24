'use client';
import {useActionState} from 'react';
import {roleLabels,roleValues,type ClubRole} from '@/lib/roles';
import {updateMemberRoles} from './actions';
import styles from './members.module.css';

export function RoleEditor({roles,target,locked}:{roles:ClubRole[];target:{kind:'user'|'invitation';id:string};locked:boolean}){
 const [state,action,pending]=useActionState(updateMemberRoles,{error:'',message:''});
 if(locked)return <div><div className={styles.roles}>{roles.map(role=><span className="badge gray" key={role}>{roleLabels[role]}</span>)}</div><span className={styles.lockedRole}>Managed in deployment settings</span></div>;
 return <form action={action} className={styles.roleEditor}>
  <input type="hidden" name="targetKind" value={target.kind}/><input type="hidden" name="targetId" value={target.id}/>
  <fieldset disabled={pending}><legend className={styles.srOnly}>Roles</legend>{roleValues.map(role=><label key={role}><input type="checkbox" name="roles" value={role} defaultChecked={roles.includes(role)}/><span>{roleLabels[role]}</span></label>)}</fieldset>
  <div className={styles.roleEditorActions}><button type="submit" className="secondary" disabled={pending}>{pending?'Saving…':'Save roles'}</button>{state.error&&<span className={styles.roleError} role="alert">{state.error}</span>}{state.message&&<span className={styles.roleSuccess} role="status">{state.message}</span>}</div>
 </form>;
}
