'use client';
import {useActionState} from 'react';
import {invitePreparedMember} from './actions';
import type {MemberDetail} from '@/lib/member-detail';
import {RoleEditor} from './role-editor';
import {MemberInfoEditor,MemberProperties} from './[id]/editor';
import styles from './members.module.css';

const dateFormatter=new Intl.DateTimeFormat('en',{year:'numeric',month:'short',day:'numeric'});
function MemberActivity({joinedAt,lastActiveAt}:{joinedAt:string;lastActiveAt:string|null}){
 return <dl className={styles.memberActivity}><div><dt>Last active</dt><dd>{lastActiveAt?<time dateTime={lastActiveAt}>{dateFormatter.format(new Date(lastActiveAt))}</time>:'Never'}</dd></div><div><dt>Joined</dt><dd><time dateTime={joinedAt}>{dateFormatter.format(new Date(joinedAt))}</time></dd></div></dl>;
}
export function MemberDetailContent({detail}:{detail:MemberDetail}){
 if(detail.kind==='prepared')return <PreparedMemberContent detail={detail}/>;
 if(detail.kind==='invitation')return <><p>{detail.email}</p><MemberActivity joinedAt={detail.joinedAt} lastActiveAt={null}/><section className="panel"><h2>Club roles</h2><RoleEditor detail roles={detail.roles} target={{kind:'invitation',id:detail.id}} locked={false}/></section><p>Member information and property associations become available once the invitation has an account linked to it.</p></>;
 const {member,info,properties,associations}=detail;
 return <><p>{member.email} · {member.status==='invited'?'Invitation pending':'Active account'}</p><MemberActivity joinedAt={member.joinedAt} lastActiveAt={member.lastActiveAt}/><section className="panel"><h2>Member information</h2><p className="muted">Sign-in email: {member.email}. Email and credential changes are managed separately through account security.</p><MemberInfoEditor userId={member.id} initial={info}/></section><section className="panel"><h2>Club roles</h2><p>These roles apply across Land Club. Admin grants access to member and content management.</p><RoleEditor detail key={member.roles.join(',')} roles={member.roles} target={member.roleTarget} locked={member.rolesLocked}/></section><section className="panel"><h2>Associated properties</h2><MemberProperties userId={member.id} initial={associations} properties={properties}/></section></>;
}

function PreparedMemberContent({detail}:{detail:Extract<MemberDetail,{kind:'prepared'}>}){
 const {prepared,properties,associations}=detail;
 const [state,action,pending]=useActionState(invitePreparedMember,{error:''});
 const frozen=prepared.status!=='draft'||!!state.message||pending;
 return <><p>{prepared.email} · {prepared.status==='draft'?'Draft member — invitation not sent':'Invitation in progress'}</p><MemberActivity joinedAt={prepared.created_at} lastActiveAt={null}/>
 <fieldset disabled={frozen} className="prepared-member-fields">
 <section className="panel"><h2>Member information</h2><p className="muted">Invitation email: {prepared.email}</p><MemberInfoEditor userId={prepared.id} initial={prepared.info}/></section>
 <section className="panel"><h2>Club roles</h2><p>Choose their access across Land Club. Admin includes member and content management.</p><RoleEditor detail roles={prepared.roles} target={{kind:'prepared',id:prepared.id}} locked={false}/></section>
 <section className="panel"><h2>Associated properties</h2><MemberProperties userId={prepared.id} initial={associations} properties={properties}/></section>
 </fieldset>
 <section className="panel"><h2>Ready to welcome them?</h2><p>Save any changes above before sending. Their profile, club roles, and property associations will be ready when they accept the invitation and choose a password.</p>
 {prepared.failure_reason&&<p role="status" className="muted">{prepared.failure_reason}</p>}
 <form action={action}><input type="hidden" name="preparedId" value={prepared.id}/><button disabled={pending||!!state.message}>{pending?'Sending invitation…':state.message?'Invitation sent':prepared.status==='sending'?'Check invitation status':'Send invitation'}</button></form>
 {prepared.status==='sending'&&<p role="status">Invitation delivery is in progress. Refresh to check its status.</p>}
 {state.error&&<p role="alert" className="cms-error">{state.error}</p>}{state.message&&<p role="status" className="cms-success">{state.message}</p>}
 </section></>;
}
