'use client';
import {useEffect,useState,useSyncExternalStore,useTransition} from 'react';
import {MemberInfoAutosave} from '@/lib/member-info-autosave';
import {propertyRoleValues,propertyRoleLabels,type PropertyRole,type MemberProperty,type MemberInfo} from '@/lib/member-properties';
import {saveMemberInfo,saveMemberProperty} from './actions';
import {PropertyPicker} from './property-picker';
import styles from '../members.module.css';
import tableStyles from '@/components/data-table.module.css';
export function MemberInfoEditor({userId,email,initial,onSaveBeforeClose,onUnsavedChange}:{userId:string;email:string;initial:MemberInfo;onSaveBeforeClose?:(save:(()=>Promise<boolean>)|null)=>void;onUnsavedChange?:(unsaved:boolean)=>void}){
 const [autosave]=useState(()=>new MemberInfoAutosave(initial,info=>saveMemberInfo(userId,info)));
 const {info,pending,error}=useSyncExternalStore(autosave.subscribe,autosave.getSnapshot,autosave.getSnapshot);
 const dirty=autosave.dirty;
 useEffect(()=>{onSaveBeforeClose?.(()=>autosave.flush());return()=>onSaveBeforeClose?.(null);},[autosave,onSaveBeforeClose]);
 useEffect(()=>{onUnsavedChange?.(dirty||pending);},[dirty,pending,onUnsavedChange]);
 useEffect(()=>{
  const guard=(event:BeforeUnloadEvent)=>{if(autosave.dirty){event.preventDefault();event.returnValue='';}};
  window.addEventListener('beforeunload',guard);
  return()=>{window.removeEventListener('beforeunload',guard);autosave.cancel();void autosave.flush();};
 },[autosave]);
 return <form className="form dashboard-form" onSubmit={event=>{event.preventDefault();void autosave.flush();}} onBlur={()=>{if(autosave.dirty)void autosave.flush();}}><fieldset className="member-detail-fields"><label>Name<input required maxLength={100} value={info.displayName} onChange={e=>autosave.edit({...info,displayName:e.target.value})}/></label><div className={styles.memberEmail}><span>Email</span><span>{email}</span></div><label>Home region<input maxLength={100} value={info.homeRegion} onChange={e=>autosave.edit({...info,homeRegion:e.target.value})}/></label><label>Contact phone<input type="tel" maxLength={50} value={info.contactPhone} onChange={e=>autosave.edit({...info,contactPhone:e.target.value})}/></label></fieldset>{(error||pending||dirty)&&<div className="row-actions"><span className="muted" role="status" aria-live="polite">{error?'Changes not saved':pending?'Saving…':dirty?'Waiting to save…':''}</span>{error&&<button type="button" className="secondary" disabled={pending} onClick={()=>void autosave.flush()}>Retry</button>}</div>}{error&&<p role="alert" className="cms-error">{error}</p>}</form>;
}
export function MemberProperties({userId,initial,properties}:{userId:string;initial:MemberProperty[];properties:{id:string;name:string}[]}){
 const [rows,setRows]=useState(initial);const [propertyId,setPropertyId]=useState('');const [roles,setRoles]=useState<PropertyRole[]>(['prospect']);const [error,setError]=useState('');const [pending,start]=useTransition();
 const available=properties.filter(p=>!rows.some(row=>row.property_id===p.id));
 function save(propertyId:string,roles:PropertyRole[],version?:number,remove=false){setError('');start(async()=>{try{const result=await saveMemberProperty({userId,propertyId,roles,version,remove});if(result.error)setError(result.error);else if(result.associations){setRows(result.associations);if(!version)setPropertyId('');}}catch{setError('Unable to save. Please try again.');}});}
 return <>{rows.length>0&&<div className={`${tableStyles.wrap} ${styles.propertyTableWrap}`}><table className={`${tableStyles.table} ${styles.propertyAssociations}`}><caption className={styles.srOnly}>Associated properties</caption><thead><tr><th scope="col">Property Name</th><th scope="col">Roles</th><th scope="col"><span className={styles.srOnly}>Remove</span></th></tr></thead><tbody>{rows.map(row=><Association key={`${row.property_id}:${row.version}`} row={row} pending={pending} save={save}/>)}</tbody></table></div>}<section className={styles.addPropertyBox}><h3>Add a property</h3>{available.length?<form className="form" onSubmit={e=>{e.preventDefault();save(propertyId,roles);}}><div className="dashboard-grid member-property-add-grid"><PropertyPicker properties={available} value={propertyId} onChange={setPropertyId} disabled={pending}/><div className={styles.addPropertyActions}><PropertyRolePicker label="Roles on this property" roles={roles} onChange={setRoles} disabled={pending}/><button disabled={pending||!propertyId||!roles.length}>{pending?'Saving…':'Add property'}</button></div></div></form>:<p className="muted">{properties.length?'All available properties are already associated.':'Create a property in Property content first.'}</p>}</section>{error&&<p role="alert" className="cms-error">{error}</p>}</>;
}
function Association({row,pending,save}:{row:MemberProperty;pending:boolean;save:(id:string,roles:PropertyRole[],version?:number,remove?:boolean)=>void}){
 const [confirm,setConfirm]=useState(false);
 return <><tr><td>{row.name}</td><td><fieldset className={styles.associationRoles} disabled={pending}><legend className={styles.srOnly}>Roles at {row.name}</legend>{propertyRoleValues.map(role=><label key={role}><input type="checkbox" checked={row.roles.includes(role)} disabled={row.roles.length===1&&row.roles.includes(role)} onChange={event=>save(row.property_id,event.target.checked?[...row.roles,role]:row.roles.filter(value=>value!==role),row.version)}/>{propertyRoleLabels[role]}</label>)}</fieldset></td><td><button type="button" className={styles.removeAssociation} disabled={pending} aria-label={`Remove association with ${row.name}`} title={`Remove association with ${row.name}`} aria-expanded={confirm} onClick={()=>setConfirm(value=>!value)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg></button></td></tr>{confirm&&<tr><td colSpan={3}><div className={styles.associationConfirmation}><span>Remove this member’s association with {row.name}?</span><div className="row-actions"><button type="button" className={styles.dangerButton} disabled={pending} onClick={()=>save(row.property_id,row.roles,row.version,true)}>Confirm removal</button><button type="button" className="secondary" disabled={pending} onClick={()=>setConfirm(false)}>Cancel</button></div></div></td></tr>}</>;

}

function PropertyRolePicker({label,roles,onChange,disabled}:{label:string;roles:PropertyRole[];onChange:(roles:PropertyRole[])=>void;disabled:boolean}){
 return <fieldset className="property-role-picker" disabled={disabled}><legend className={styles.srOnly}>{label}</legend><div>{propertyRoleValues.map(role=><label key={role}><input type="checkbox" checked={roles.includes(role)} onChange={e=>onChange(e.target.checked?[...roles,role]:roles.filter(value=>value!==role))}/>{propertyRoleLabels[role]}</label>)}</div>{!roles.length&&<p className="muted">Select at least one role.</p>}</fieldset>;
}
