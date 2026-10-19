import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {sourceReviewReports,sourceMoney,localSourceReviewAllowed} from '../src/lib/investor-source-review';
test('private fixture access requires an authenticated administrator on the loopback development host',()=>{
 for(const env of ['production','test',undefined])assert.equal(localSourceReviewAllowed({admin:true,local:true},env,'127.0.0.1:3000'),false);
 for(const actor of [null,{admin:false,local:true},{admin:false,local:false}])assert.equal(localSourceReviewAllowed(actor,'development','127.0.0.1:3000'),false);
 for(const actor of [{admin:true,local:false},{admin:true,local:true},{admin:true}]){
  for(const host of ['localhost:3000','127.0.0.1:3000'])assert.equal(localSourceReviewAllowed(actor,'development',host),true);
  for(const host of ['', 'land.club','localhost:3000.evil.test','192.168.1.5:3000','127.0.0.1:3001'])assert.equal(localSourceReviewAllowed(actor,'development',host),false);
 }
 assert.equal(sourceMoney('47145.82'),'47145.82');assert.equal(sourceMoney('0'),'0.00');assert.equal(sourceMoney(''),null);assert.throws(()=>sourceMoney('1.123'));
});
const sourceFile=new URL('../.data/investor-review/workbooks.json',import.meta.url);
test('actual 40-tab source fixture maps all positions without changing source values or granting access',{skip:!existsSync(sourceFile)},()=>{
 const input=JSON.parse(readFileSync(sourceFile,'utf8')),before=JSON.stringify(input),reports=sourceReviewReports(input);
 assert.equal(input.reduce((n:number,b:{tabs:unknown[]})=>n+b.tabs.length,0),40);assert.equal(reports.length,22);assert.equal(JSON.stringify(input),before);
 const norden=reports.find(r=>r.id==='POS-006')!,sutter=reports.find(r=>r.id==='POS-101')!,reserve=reports.find(r=>r.id==='POS-102')!;
 assert.equal(norden.kind,'loan');assert.equal(sutter.kind,'loan');assert.equal(reserve.kind,'reserve');
 assert.ok(norden.lines.some(l=>l.label==='principal outstanding'&&l.amount==='125000.00'));
 assert.ok(sutter.lines.some(l=>l.label==='principal'&&l.amount==='250000.00'));assert.ok(sutter.lines.some(l=>l.label==='entitlement'&&l.amount==='275404.43'));
 assert.ok(sutter.lines.some(l=>l.label==='balance today'&&l.amount==='221019.16'));assert.ok(reserve.lines.some(l=>l.label==='balance today'&&l.amount==='47688.32'));
 assert.equal(sutter.lines.find(l=>l.id==='TXN-1003')?.basis,'internal_transfer');assert.equal(reserve.lines.find(l=>l.id==='TXN-1004')?.basis,'internal_transfer');
 assert.ok(sutter.schedules.some(s=>s.scheduled_date==='2026-11-30'));assert.ok(sutter.schedules.some(s=>s.scheduled_date==='2026-12-04'));assert.ok(sutter.schedules.every(s=>s.confirmation==='pending'));
 assert.equal(sutter.findings.find(f=>f.id==='SCH-103')?.source_value,'2869.45');assert.ok(norden.schedules.some(s=>s.scheduled_date===null));
 assert.ok(reports.every(r=>r.released_at===null&&r.review_state==='draft'&&r.documents.length===0));
 assert.equal(reports.find(r=>r.id==='POS-116')?.kind,'vendor');assert.equal(reports.find(r=>r.id==='POS-004')?.kind,'manager');
 assert.throws(()=>sourceReviewReports(input.filter((b:{filename:string})=>!b.filename.includes('Norden_Cross_Data'))),/Unresolved/);
});
