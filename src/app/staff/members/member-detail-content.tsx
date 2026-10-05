'use client';
import {useActionState,useEffect,useRef,useState,type ReactNode} from 'react';
import {invitePreparedMember} from './actions';
import type {MemberDetail} from '@/lib/member-detail';
import {RoleEditor} from './role-editor';
import {MemberInfoEditor,MemberProperties} from './[id]/editor';
import styles from './members.module.css';
import {MemberDocuments} from '@/components/member-documents';
import {propertyRoleLabels} from '@/lib/member-properties';
import {roleLabels} from '@/lib/roles';
const documentSuggestions=(properties:{name:string}[])=>[...properties.map(p=>'Property: '+p.name),...[...new Set([...Object.values(propertyRoleLabels),...Object.values(roleLabels)])].map(role=>'Role: '+role)];

function DetailSection({title,children}:{title:string;children:ReactNode}){
 const section=useRef<HTMLDetailsElement>(null),restored=useRef(false),lastOpen=useRef(true);
 const storageKey=`land-club:member-details:section:${title}`;
 useEffect(()=>{
  const element=section.current;if(!element)return;
  try{const saved=localStorage.getItem(storageKey);if(saved==='closed'||saved==='open')element.open=saved==='open';}catch{/* Keep sections usable if browser storage is unavailable. */}
  lastOpen.current=element.open;restored.current=true;
 },[storageKey]);
 return <details ref={section} className={styles.detailSection} open onToggle={event=>{
  const expanded=event.currentTarget.open;
  if(!restored.current||expanded===lastOpen.current)return;
  lastOpen.current=expanded;
  try{localStorage.setItem(storageKey,expanded?'open':'closed');}catch{/* Toggling still works without local storage. */}
 }}><summary><h2>{title}</h2><svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></summary><div className={styles.detailSectionBody}>{children}</div></details>;
}
type SaveBeforeClose=(save:(()=>Promise<boolean>)|null)=>void;
export function MemberDetailContent({detail,onSaveBeforeClose}:{detail:MemberDetail;onSaveBeforeClose?:SaveBeforeClose}){
 if(detail.kind==='prepared')return <PreparedMemberContent detail={detail} onSaveBeforeClose={onSaveBeforeClose}/>;
 if(detail.kind==='invitation')return <div className={styles.memberDetails}><DetailSection title="Member Info"><div className={styles.memberEmail}><span>Email</span><span>{detail.email}</span></div><p className="muted">Member information becomes available once the invitation has an account linked to it.</p><h3>Club Roles</h3><RoleEditor detail roles={detail.roles} target={{kind:'invitation',id:detail.id}} locked={false}/></DetailSection><DetailSection title="Properties"><p className="muted">Property associations become available once the invitation has an account linked to it.</p></DetailSection><DetailSection title="Documents"><p className="muted">Documents can be added once this invitation has a member account linked to it.</p></DetailSection></div>;
 const {member,info,properties,associations}=detail;
 return <div className={styles.memberDetails}><DetailSection title="Member Info"><MemberInfoEditor email={member.email} userId={member.id} initial={info} onSaveBeforeClose={onSaveBeforeClose}/><h3>Club Roles</h3><RoleEditor detail key={member.roles.join(',')} roles={member.roles} target={member.roleTarget} locked={member.rolesLocked}/></DetailSection><DetailSection title="Properties"><MemberProperties userId={member.id} initial={associations} properties={properties}/></DetailSection><DetailSection title="Documents"><MemberDocuments memberId={member.id} suggestions={documentSuggestions(properties)}/></DetailSection></div>;
}

function PreparedMemberContent({detail,onSaveBeforeClose}:{detail:Extract<MemberDetail,{kind:'prepared'}>;onSaveBeforeClose?:SaveBeforeClose}){
 const {prepared,properties,associations}=detail;
 const [state,action,pending]=useActionState(invitePreparedMember,{error:''});
 const [infoUnsaved,setInfoUnsaved]=useState(false);
 const frozen=prepared.status!=='draft'||!!state.message||pending;
 return <div className={styles.memberDetails}>
 <fieldset disabled={frozen} className="prepared-member-fields">
 <DetailSection title="Member Info"><MemberInfoEditor email={prepared.email} userId={prepared.id} initial={prepared.info} onSaveBeforeClose={onSaveBeforeClose} onUnsavedChange={setInfoUnsaved}/><h3>Club Roles</h3><RoleEditor detail roles={prepared.roles} target={{kind:'prepared',id:prepared.id}} locked={false}/></DetailSection>
 <DetailSection title="Properties"><MemberProperties userId={prepared.id} initial={associations} properties={properties}/></DetailSection>
 <DetailSection title="Documents"><MemberDocuments memberId={prepared.id} suggestions={documentSuggestions(properties)}/></DetailSection>
 </fieldset>
 <section className={styles.memberInvite}><h2>Ready to welcome them?</h2><p>Save any changes above before sending. Their profile, club roles, and property associations will be ready when they accept the invitation and choose a password.</p>
 {prepared.failure_reason&&<p role="status" className="muted">{prepared.failure_reason}</p>}
 <form action={action}><input type="hidden" name="preparedId" value={prepared.id}/><button disabled={pending||infoUnsaved||!!state.message}>{pending?'Sending invitation…':state.message?'Invitation sent':prepared.status==='sending'?'Check invitation status':'Send invitation'}</button></form>
 {prepared.status==='sending'&&<p role="status">Invitation delivery is in progress. Refresh to check its status.</p>}
 {state.error&&<p role="alert" className="cms-error">{state.error}</p>}{state.message&&<p role="status" className="cms-success">{state.message}</p>}
 </section></div>;
}
