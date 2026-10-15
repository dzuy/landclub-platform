import {execFile} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {isAbsolute} from 'node:path';
import type {Database} from './database';
import {auditActor,documentDigest} from './document-security';
import {validateDocument} from './member-documents';
import {validateDocumentContent} from './document-content';
export type ScanResult='clean'|'blocked'|'unavailable';
// Only a locally installed, operator-configured ClamAV binary. No remote service or upload.
export async function scanWithClamAV(bytes:Uint8Array,executable=process.env.LAND_CLUB_CLAMSCAN_PATH):Promise<ScanResult>{
 if(!executable||!isAbsolute(executable))return 'unavailable';
 const directory=await mkdtemp(path.join(tmpdir(),'land-club-scan-'));
 try{
  const file=path.join(directory,'document');await writeFile(file,bytes,{mode:0o600});
  return await new Promise(resolve=>execFile(executable,['--no-summary','--fail-if-cvd-older-than=7','--alert-encrypted=yes','--tempdir='+directory,'--max-filesize=20M','--max-scansize=100M','--alert-exceeds-max=yes','--',file],{timeout:60000,maxBuffer:65536,env:{PATH:process.env.PATH,NODE_ENV:process.env.NODE_ENV}},error=>resolve(!error?'clean':(error as {code?:number}).code===1?'blocked':'unavailable')));
 }finally{await rm(directory,{recursive:true,force:true});}
}
export async function scanQuarantinedDocument(db:Database,kind:'member_documents'|'group_documents',id:string,scanner:(bytes:Uint8Array)=>Promise<ScanResult>=scanWithClamAV){
 if(!['member_documents','group_documents'].includes(kind))throw new Error('Invalid document kind.');
 const row=(await db.query<{content:string;filename:string}>(`SELECT content,filename FROM ${kind} WHERE id=$1 AND scan_status='quarantined'`,[id])).rows[0];if(!row)return 'skipped';
 const bytes=Buffer.from(row.content,'base64');let result:ScanResult='unavailable';
 try{validateDocument(row.filename,bytes);await validateDocumentContent(row.filename,bytes);}catch{result='blocked';}
 if(result!=='blocked'){try{result=await scanner(bytes);}catch{result='unavailable';}}
 if(result!=='clean'&&result!=='blocked')return 'unavailable';
 // Bind the verdict to the exact original bytes and status; a racing change cannot inherit it.
 await db.transaction(async tx=>{await auditActor(tx,'local-malware-scanner');await tx.query(`UPDATE ${kind} SET scan_status=$2,scanned_sha256=$3,scanned_at=now() WHERE id=$1 AND scan_status='quarantined' AND content=$4`,[id,result,documentDigest(bytes),row.content]);});
 return result;
}
