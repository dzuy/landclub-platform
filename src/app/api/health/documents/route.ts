import {scannerReady} from '@/lib/scanner-readiness';
import {database} from '@/lib/database';
export const dynamic='force-dynamic';
export async function GET(){let ready=false;try{await database().query('SELECT 1');ready=await scannerReady();}catch{/* Operational status without internal details. */}return Response.json({status:ready?'ok':'unavailable',service:'land-club-documents'},{status:ready?200:503,headers:{'Cache-Control':'no-store'}});}
