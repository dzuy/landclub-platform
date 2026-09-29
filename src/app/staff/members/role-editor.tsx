'use client';
import {useActionState} from 'react';
import {roleLabels,roleValues,type ClubRole} from '@/lib/roles';
import {updateMemberRoles} from './actions';
import styles from './members.module.css';

export function RoleEditor({roles,target,locked,detail=false}:{detail?:boolean;roles:ClubRole[];target:{kind:'user'|'invitation'|'prepared';id:string};locked:boolean}){
 const [state,action,pending]=useActionState(updateMemberRoles,{error:'',message:''});
 if(locked&&!detail)return <div><div className={styles.roles}>{roles.map(role=><span className="badge gray" key={role}>{roleLabels[role]}</span>)}</div><span className={styles.lockedRole}>{target.kind==='prepared'?'Invitation in progress':'Managed in deployment settings'}</span></div>;
 return <form action={action} className={`${styles.roleEditor} ${detail?styles.detailRoleEditor:''}`}>
  <input type="hidden" name="targetKind" value={target.kind}/><input type="hidden" name="targetId" value={target.id}/>
  {detail&&<p className="muted">{locked?'Available club roles':'Select all that apply.'}</p>}
  <fieldset disabled={pending||locked}><legend className={styles.srOnly}>Club roles</legend>{roleValues.map(role=><label key={role}><input type="checkbox" name="roles" value={role} defaultChecked={roles.includes(role)}/><span>{roleLabels[role]}</span></label>)}</fieldset>
  {locked?<p className={styles.lockedRole}>This account’s roles are managed in deployment settings.</p>:<div className={styles.roleEditorActions}><button type="submit" className="secondary" disabled={pending}>{pending?'Saving…':'Save roles'}</button>{state.error&&<span className={styles.roleError} role="alert">{state.error}</span>}{state.message&&<span className={styles.roleSuccess} role="status">{state.message}</span>}</div>}
 </form>;
}
