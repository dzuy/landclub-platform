import 'server-only';
import {z} from 'zod';
import {managedMember} from './managed-member';
import {database} from './database';
import {InvitationRepository} from './invitations';
import {buildMemberDirectory} from './members';
import {store} from './store';
import {memberPropertyStore} from './member-property-store';
export async function loadMemberDetail(id:string){
 const repo=new InvitationRepository(database());await repo.initialize();const invitations=await repo.list();
 if(id.startsWith('invitation:')){const invitation=invitations.find(i=>`invitation:${i.id}`===id);if(!invitation)throw new Error('Member not found.');return {kind:'invitation' as const,id:invitation.id,email:invitation.email,roles:invitation.roles};}
 z.uuid().parse(id);const user=await managedMember(id);
 const member=buildMemberDirectory([user],invitations,await repo.roleAssignments(),process.env.STAFF_USER_IDS).find(m=>m.id===id)!;
 const metadata=user.user_metadata||{};
 return {kind:'member' as const,member,info:{displayName:member.name||'',homeRegion:typeof metadata.home_region==='string'?metadata.home_region:'',contactPhone:typeof metadata.contact_phone==='string'?metadata.contact_phone:''},properties:(await (await store()).list()).map(p=>({id:p.id,name:p.draft.name})),associations:await (await memberPropertyStore()).list(id)};
}
export type MemberDetail=Awaited<ReturnType<typeof loadMemberDetail>>;
