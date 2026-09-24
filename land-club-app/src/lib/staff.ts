import 'server-only';
import { headers } from 'next/headers';
import {localStaffAllowed} from './local-access';
export async function requireStaff(){const h=await headers();if(!localStaffAllowed(process.env.NODE_ENV,process.env.LAND_CLUB_LOCAL_STAFF,h.get('host')||''))throw new Error('Staff access is unavailable. Hosted authentication has not been configured.');return {id:'local-developer',name:'Local editor'};}
