// Operator-only worker. No web endpoint, manual bypass, external scanner, or automatic installation.
import {database} from '../src/lib/database';
import {scanQuarantinedDocument} from '../src/lib/document-scanner';
async function main(){
 if(!process.env.LAND_CLUB_CLAMSCAN_PATH)throw new Error('Configure a local ClamAV executable with current signatures before scanning. Documents remain quarantined.');
 const db=database();
 for(const kind of ['member_documents','group_documents'] as const){
  const rows=(await db.query<{id:string}>(`SELECT id FROM ${kind} WHERE scan_status='quarantined' ORDER BY created_at LIMIT 100`)).rows;
  for(const row of rows){const result=await scanQuarantinedDocument(db,kind,row.id);console.log(kind,row.id,result);if(result==='unavailable')throw new Error('Scanner unavailable; remaining documents stay quarantined.');}
 }
}
main().then(()=>process.exit(0)).catch(()=>{console.error('Document scanning failed; no unscanned files were released. Check scanner configuration and database availability.');process.exit(1);});
