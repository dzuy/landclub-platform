import 'server-only';
import {headers,cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {localStaffAllowed} from './local-access';
import {currentUser} from './auth/identity';
import {isStaffUser,authConfigured} from './auth/policy';
import {database} from './database';
import {InvitationRepository} from './invitations';
import type {ClubRole} from './roles';
export class StaffAccessError extends Error{constructor(){super('Please sign in with an authorized staff account.');}}
export class MemberAccessError extends Error{constructor(){super('Please sign in with an invited Land Club account.');}}
type AuthUser={id:string;email?:string|null;email_confirmed_at?:string|null;is_anonymous?:boolean};
export async function clubUserRoles(user:AuthUser|null):Promise<ClubRole[]>{
 if(!user||user.is_anonymous||!user.email_confirmed_at)return [];
 if(isStaffUser(user,process.env.STAFF_USER_IDS))return ['member','admin'];
 try{return await new InvitationRepository(database()).rolesForUser(user.id);}catch{return [];}
}
export async function clubUserAuthorized(user:AuthUser|null){return (await clubUserRoles(user)).length>0;}
export async function staffUserAuthorized(user:AuthUser|null){return (await clubUserRoles(user)).includes('admin');}
export async function clubIdentity(){
 const h=await headers();
 if(localStaffAllowed(process.env.NODE_ENV,process.env.LAND_CLUB_LOCAL_STAFF,h.get('host')||'')&&(await cookies()).get('land-club-local-signed-out')?.value!=='1')return {id:'local-developer',name:'Local editor',local:true,admin:true as const,roles:['member','admin'] as ClubRole[]};
 if(!authConfigured())return null;
 const user=await currentUser(),roles=await clubUserRoles(user);if(!user||!roles.length)return null;
 return {id:user.id,name:user.email||'Land Club member',local:false,admin:roles.includes('admin'),roles};
}
export async function staffIdentity(){const actor=await clubIdentity();return actor?.admin?{...actor,admin:true as const}:null;}
export async function requireStaff(){const actor=await staffIdentity();if(!actor)throw new StaffAccessError();return actor;}
export async function requireMember(){const actor=await clubIdentity();if(!actor)throw new MemberAccessError();return actor;}

export async function requireStaffPage(){const actor=await clubIdentity();if(!actor)redirect('/signin');if(!actor.admin)redirect('/staff');return {...actor,admin:true as const};}
export async function requireMemberPage(){const actor=await clubIdentity();if(!actor)redirect('/signin');return actor;}
