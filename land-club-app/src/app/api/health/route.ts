import {database} from '@/lib/database';
import {authConfigured} from '@/lib/auth/policy';
export const dynamic='force-dynamic';
export async function GET(){try{if(process.env.NODE_ENV==='production'&&(!authConfigured()||!process.env.STAFF_USER_IDS))throw new Error('Missing auth configuration');await database().query('SELECT id FROM properties LIMIT 1');return Response.json({status:'ok',service:'land-club-content'},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}}
