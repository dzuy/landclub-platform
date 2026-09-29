'use client';
import type {MemberDetail} from '@/lib/member-detail';
import {RoleEditor} from './role-editor';
import {MemberInfoEditor,MemberProperties} from './[id]/editor';
export function MemberDetailContent({detail}:{detail:MemberDetail}){
 if(detail.kind==='invitation')return <><p>{detail.email}</p><section className="panel"><h2>Club roles</h2><RoleEditor roles={detail.roles} target={{kind:'invitation',id:detail.id}} locked={false}/></section><p>Member information and property associations become available once the invitation has an account linked to it.</p></>;
 const {member,info,properties,associations}=detail;
 return <><p>{member.email} · {member.status==='invited'?'Invitation pending':'Active account'}</p><section className="panel"><h2>Member information</h2><p className="muted">Sign-in email: {member.email}. Email and credential changes are managed separately through account security.</p><MemberInfoEditor userId={member.id} initial={info}/></section><section className="panel"><h2>Club roles</h2><p>These roles apply across Land Club. Admin grants access to member and content management.</p><RoleEditor key={member.roles.join(',')} roles={member.roles} target={member.roleTarget} locked={member.rolesLocked}/></section><section className="panel"><h2>Associated properties</h2><MemberProperties userId={member.id} initial={associations} properties={properties}/></section></>;
}
