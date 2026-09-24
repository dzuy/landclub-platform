import {store} from '@/lib/store';
export const dynamic='force-dynamic';
export async function GET(){try{await store();return Response.json({status:'ok',service:'land-club-content'},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({status:'unavailable'},{status:503});}}
