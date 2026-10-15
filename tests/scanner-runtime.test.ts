import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {healthyScanner,scannerReady,writeScannerHealth,documentServiceReady} from '../src/lib/scanner-readiness';
import {signatureDateFromVersion,readScannerSignatureDate} from '../src/lib/scanner-signatures';
import {probeScanner} from '../src/lib/scanner-probe';
import {scanWithClamAV} from '../src/lib/document-scanner';
import {supervise} from '../scripts/start-services.mjs';

test('readiness requires a recent successful probe and a live heartbeat; missing or corrupt state fails closed',async()=>{
 const now=Date.now();assert.equal(healthyScanner({ready:true,heartbeat:now,lastProbe:now,signatureDate:now},now),true);
 for(const h of [null,{}, {ready:false,heartbeat:now,lastProbe:now,signatureDate:now},{ready:true,heartbeat:now-180001,lastProbe:now,signatureDate:now},{ready:true,heartbeat:now,lastProbe:now-7*60*60*1000-1,signatureDate:now},{ready:true,heartbeat:now+1000,lastProbe:now,signatureDate:now}])assert.equal(healthyScanner(h,now),false);
 const dir=await mkdtemp(path.join(tmpdir(),'lc-health-test-'));try{const file=path.join(dir,'health.json');assert.equal(await scannerReady(file),false);await writeScannerHealth({ready:true,heartbeat:Date.now(),lastProbe:Date.now(),signatureDate:Date.now()},file);assert.equal(await scannerReady(file),true);await writeFile(file,'broken');assert.equal(await scannerReady(file),false);}finally{await rm(dir,{recursive:true,force:true});}
});

test('startup requires both clean-file acceptance and harmless EICAR detection',async()=>{
 await probeScanner(async bytes=>Buffer.from(bytes).includes(Buffer.from('EICAR'))?'blocked':'clean');
 await assert.rejects(probeScanner(async()=> 'clean'),/detection/);
 await assert.rejects(probeScanner(async()=> 'unavailable'),/clean-file/);
});

test('local executable integration maps clean, infected, unavailable outcomes without remote calls',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'lc-scanner-test-'));try{
  const binary=path.join(dir,'mock-clamav');
  await writeFile(binary,`#!/usr/bin/env node\nconst fs=require('node:fs');const data=fs.readFileSync(process.argv.at(-1),'utf8');process.exit(data.includes('EICAR')?1:data.includes('unavailable')?2:0);`,{mode:0o700});
  await probeScanner(bytes=>scanWithClamAV(bytes,binary));
  assert.equal(await scanWithClamAV(Buffer.from('unavailable'),binary),'unavailable');
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('worker failure clears readiness and retries with backoff without killing the web process',()=>{
 const children:(EventEmitter & {exitCode:number|null;kills:string[];kill:(signal:string)=>boolean})[]=[],exits:number[]=[],scheduled:{fn:()=>void;ms:number}[]=[],signals:Record<string,()=>void>={};let unavailable=0;
 const launch=()=>{const child=Object.assign(new EventEmitter(),{exitCode:null as number|null,kills:[] as string[],kill:(signal:string)=>{child.kills.push(signal);child.exitCode=0;return true;}});children.push(child);return child;};
 const runSupervisor=supervise as unknown as (commands:string[][],options:Record<string,unknown>)=>unknown;
 runSupervisor([['server.js'],['worker.js']],{launch,exit:(code:number)=>exits.push(code),onSignal:(name:string,handler:()=>void)=>{signals[name]=handler;},schedule:(fn:()=>void,ms:number)=>{scheduled.push({fn,ms});return scheduled.length;},cancel:()=>{},markUnavailable:()=>{unavailable++;},now:()=>0});
 children[1].exitCode=1;children[1].emit('exit',1);assert.equal(children[0].kills.length,0);assert.equal(exits.length,0);assert.equal(unavailable,1);assert.equal(scheduled[0].ms,5000);
 scheduled[0].fn();assert.equal(children.length,3);children[2].exitCode=1;children[2].emit('exit',1);assert.equal(scheduled[1].ms,10000);assert.equal(children[0].kills.length,0);
 signals.SIGTERM();assert.ok(children[0].kills.includes('SIGTERM'));assert.ok(exits.includes(0));
});

test('production document gate fails closed while general health is independent of scanner readiness',async()=>{
 assert.equal(await documentServiceReady('production',async()=>false),false);
 assert.equal(await documentServiceReady('production',async()=>true),true);
 const general=await readFile(new URL('../src/app/api/health/route.ts',import.meta.url),'utf8');assert.doesNotMatch(general,/throw new Error\('Scanner/);assert.match(general,/documents:await scannerReady/);
 for(const route of ['member-documents/route.ts','group-documents/route.ts','member-documents/[id]/route.ts','group-documents/[id]/route.ts']){
  const source=await readFile(new URL('../src/app/api/'+route,import.meta.url),'utf8');assert.match(source,/if\(!await documentServiceReady\(\)\)return documentJson/);assert.match(source,/temporarily unavailable.*503/);
 }
 const documentHealth=await readFile(new URL('../src/app/api/health/documents/route.ts',import.meta.url),'utf8');assert.match(documentHealth,/status:ready\?200:503/);
});

test('deployment probes packaged scanner before migrations and includes worker, signatures and health gating',async()=>{
 const docker=await readFile(new URL('../Dockerfile',import.meta.url),'utf8');assert.match(docker,/clamav-freshclam/);assert.match(docker,/COPY.*\.scanner/);assert.match(docker,/RUN freshclam/);assert.match(docker,/start-services\.mjs/);
 const predeploy=await readFile(new URL('../scripts/predeploy.mjs',import.meta.url),'utf8');assert.ok(predeploy.indexOf("'--probe'")<predeploy.indexOf("'migrate.mjs'"));
});

 test('lightweight signature checks reject stale, missing, future and failed scanner metadata',async()=>{
 const now=Date.UTC(2026,9,15,12);const fresh='ClamAV 1.4.3/28000/Thu Oct 15 11:00:00 2026';
 assert.equal(signatureDateFromVersion(fresh,now),now-3600000);
 for(const output of ['ClamAV 1.4.3','broken','ClamAV 1.4.3/28000/Thu Oct 01 11:00:00 2026','ClamAV 1.4.3/28000/Fri Oct 16 11:00:00 2026'])assert.throws(()=>signatureDateFromVersion(output,now));
 await assert.rejects(readScannerSignatureDate('/nonexistent/clamav'));
 assert.equal(healthyScanner({ready:true,heartbeat:now,lastProbe:now,signatureDate:now-7*86400000},now),false);
 assert.equal(healthyScanner({ready:true,heartbeat:now,lastProbe:now},now),false);
 });
