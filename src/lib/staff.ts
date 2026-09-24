import 'server-only';
import {headers,cookies} from 'next/headers';
import {localStaffAllowed} from './local-access';
import {authClient} from './auth/client';
import {isStaffUser,authConfigured} from './auth/policy';
import {database} from './database';
import {InvitationRepository} from './invitations';
export class StaffAccessError extends Error{constructor(){super('Please sign in with an authorized staff account.');}}
export async function staffUserAuthorized(user:{id:string;email_confirmed_at?:string|null;is_anonymous?:boolean}|null){
 if(isStaffUser(user,process.env.STAFF_USER_IDS))return true;if(!user||user.is_anonymous||!user.email_confirmed_at)return false;
 try{return await new InvitationRepository(database()).hasRole(user.id,'admin');}catch{return false;}
}
export async function staffIdentity(){
 const h=await headers();
 if(localStaffAllowed(process.env.NODE_ENV,process.env.LAND_CLUB_LOCAL_STAFF,h.get('host')||'')&&(await cookies()).get('land-club-local-signed-out')?.value!=='1')return {id:'local-developer',name:'Local editor',local:true};
 if(!authConfigured())return null;
 try{const {data:{user},error}=await (await authClient()).auth.getUser();if(error||!user||!await staffUserAuthorized(user))return null;return {id:user.id,name:user.email||'Staff member',local:false};}catch{return null;}
}
export async function requireStaff(){const actor=await staffIdentity();if(!actor)throw new StaffAccessError();return actor;}

export async function requireStaffPage(){const actor=await staffIdentity();if(!actor){const {redirect}=await import('next/navigation');redirect('/signin');}return actor;}
