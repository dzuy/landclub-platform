import type {Database} from './database';
import type {PreparedInvestor} from './investor-platform';
import {InvitationRepository} from './invitations';
import {readRoles} from './roles';
/** Explicit IDs only: a source name/email never grants member access. */
export async function previewMemberIdentity(db:Database,person:PreparedInvestor){
 const prepared=person.prepared_member_id?(await db.query<{id:string;auth_user_id:string|null;roles:string[];info:{displayName?:string;homeRegion?:string;contactPhone?:string}}>('SELECT id,auth_user_id,roles,info FROM prepared_members WHERE id=$1',[person.prepared_member_id])).rows[0]:null;
 if(person.prepared_member_id&&!prepared)return null;
 if(person.auth_user_id&&prepared?.auth_user_id&&person.auth_user_id!==prepared.auth_user_id)return null;
 const linked=person.auth_user_id||prepared?.auth_user_id,memberId=linked||prepared?.id;
 if(!memberId)return null;
 const roles=linked?await new InvitationRepository(db).rolesForUser(linked):prepared?.roles||[];
 if(!roles.length)return null;
 return {memberId,roles:readRoles(roles).filter(role=>role!=='admin'),profile:prepared?.info};
}
