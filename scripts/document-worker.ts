import {execFile} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {database} from '../src/lib/database';
import {scanQuarantinedDocument} from '../src/lib/document-scanner';
import {probeScanner} from '../src/lib/scanner-probe';
import {readScannerSignatureDate} from '../src/lib/scanner-signatures';
import {writeScannerHealth} from '../src/lib/scanner-readiness';
async function updateSignatures(){
 return new Promise<boolean>(resolve=>execFile('/usr/bin/freshclam',['--config-file=/app/deployment/freshclam.conf','--stdout'],{timeout:120000,maxBuffer:65536,env:{PATH:process.env.PATH,NODE_ENV:process.env.NODE_ENV}},error=>resolve(!error)));
}
async function main(){
 if(!process.env.LAND_CLUB_CLAMSCAN_PATH)throw new Error('Scanner path missing.');
 // Standalone probe never initializes a database or downloads signatures.
 if(process.argv.includes('--probe')){await readScannerSignatureDate();await probeScanner();return;}
 await updateSignatures();
 let signatureDate=await readScannerSignatureDate();
 await probeScanner();
 let lastProbe=Date.now(),lastUpdate=Date.now();
 const heartbeat=()=>writeScannerHealth({ready:true,heartbeat:Date.now(),lastProbe,signatureDate});
 const db=database();
 for(;;){
  signatureDate=await readScannerSignatureDate();
  await heartbeat();
  if(Date.now()-lastUpdate>6*60*60*1000){
   const updated=await updateSignatures();lastUpdate=Date.now();
   console.log(updated?'Scanner signatures refreshed.':'Signature update unavailable; checking existing signatures.');
   signatureDate=await readScannerSignatureDate();await probeScanner();lastProbe=Date.now();await heartbeat();
  }
  let processed=0;
  for(const kind of ['member_documents','group_documents'] as const){
   const rows=(await db.query<{id:string}>(`SELECT id FROM ${kind} WHERE scan_status='quarantined' ORDER BY created_at LIMIT 10`)).rows;
   for(const row of rows){
    await heartbeat();const result=await scanQuarantinedDocument(db,kind,row.id);
    if(result==='unavailable')throw new Error('Scanner unavailable.');
    processed++;await heartbeat();
     }
  }
  if(processed)console.log(`Scanner processed ${processed} queued documents.`);
  await delay(processed?1000:30000);
 }
}
main().then(()=>process.exit(0)).catch(async()=>{await writeScannerHealth({ready:false,heartbeat:Date.now(),lastProbe:0,signatureDate:0}).catch(()=>{});console.error('Document worker unhealthy; files remain quarantined.');process.exit(1);});
