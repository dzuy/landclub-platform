'use client';
import {useEffect,useRef,useState,useTransition} from 'react';
import {readRoles,roleLabels,roleValues,type ClubRole} from '@/lib/roles';
import {updateMemberRoles} from './actions';
import styles from './members.module.css';

export function RoleEditor({roles,target,locked,detail=false}:{detail?:boolean;roles:ClubRole[];target:{kind:'user'|'invitation'|'prepared';id:string};locked:boolean}){
 const [selected,setSelected]=useState(roles),[state,setState]=useState({error:'',message:''});
 const [pending,startTransition]=useTransition(),saving=useRef(false);
 useEffect(()=>{if(!saving.current)setSelected(roles);},[roles]);
 function change(role:ClubRole,checked:boolean){
  if(locked||saving.current)return;
  const previous=selected,next=readRoles(checked?[...selected,role]:selected.filter(value=>value!==role));
  const form=new FormData();form.set('targetKind',target.kind);form.set('targetId',target.id);next.forEach(value=>form.append('roles',value));
  saving.current=true;setSelected(next);setState({error:'',message:''});
  startTransition(async()=>{
   try{const result=await updateMemberRoles({error:'',message:''},form);setState({error:result.error||'',message:result.message||''});if(result.error)setSelected(previous);}
   catch{setSelected(previous);setState({error:'Your change could not be saved. Please try again.',message:''});}
   finally{saving.current=false;}
  });
 }
 if(locked&&!detail)return <div><div className={styles.roles}>{roles.map(role=><span className="badge gray" key={role}>{roleLabels[role]}</span>)}</div>{target.kind==='prepared'&&<span className={styles.lockedRole}>Invitation in progress</span>}</div>;
 return <div className={`${styles.roleEditor} ${detail?styles.detailRoleEditor:''}`}>
  <fieldset disabled={pending||locked}><legend className={styles.srOnly}>Club roles</legend>{roleValues.map(role=><label key={role}><input type="checkbox" name="roles" value={role} checked={selected.includes(role)} onChange={event=>change(role,event.target.checked)}/><span>{roleLabels[role]}</span></label>)}</fieldset>
  {locked?<p className={styles.lockedRole}>This account’s roles are managed in deployment settings.</p>:<>{state.error&&<span className={styles.roleError} role="alert">{state.error}</span>}<span className={styles.roleSuccess} role="status" aria-live="polite">{pending?'Saving…':state.message?'Saved':''}</span></>}
 </div>;
}
