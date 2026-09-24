import 'server-only';
import {headers} from 'next/headers';
import {localStaffAllowed} from './local-access';
import {authClient} from './auth/client';
import {isStaffUser,authConfigured} from './auth/policy';
export class StaffAccessError extends Error{constructor(){super('Please sign in with an authorized staff account.');}}
export async function staffIdentity(){
 const h=await headers();
 if(localStaffAllowed(process.env.NODE_ENV,process.env.LAND_CLUB_LOCAL_STAFF,h.get('host')||''))return {id:'local-developer',name:'Local editor',local:true};
 if(!authConfigured())return null;
 try{const {data:{user},error}=await (await authClient()).auth.getUser();if(error||!user||!isStaffUser(user,process.env.STAFF_USER_IDS))return null;return {id:user.id,name:user.email||'Staff member',local:false};}catch{return null;}
}
export async function requireStaff(){const actor=await staffIdentity();if(!actor)throw new StaffAccessError();return actor;}

export async function requireStaffPage(){const actor=await staffIdentity();if(!actor){const {redirect}=await import('next/navigation');redirect('/signin');}return actor;}
