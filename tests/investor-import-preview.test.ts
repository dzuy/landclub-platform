import test from 'node:test';
import assert from 'node:assert/strict';
import {previewInvestorImport,excelDateOnly} from '../src/lib/investor-import-preview';
const admin={id:'test',admin:true};
function fixture(){return {sourceKey:'review',filename:'normalized.json',entities:[{id:'ENT-NC',source:'entities/2',name:'Land Club Norden Cross LLC'}],holders:[{id:'INV-006',source:'holders/2',name:'Norden Cross LLC'}],people:[{id:'PER-007',source:'people/2',email:null,getsLogin:true,requestedRoles:['admin']}],access:[{personId:'PER-007',holderId:'INV-006'}],positions:[{id:'POS-006',source:'positions/2',holderId:'INV-006',entityId:'ENT-NC',kind:'loan',terms:{}}],loans:[],events:[{id:'DST-001',source:'distributions/2',positionId:'POS-006',date:'2026-09-04',amount:'47145.82',classification:'internal_transfer',economicEventKey:'payment-1',transferGroup:'reserve-transfer'},{id:'SCH-101',source:'schedule/2',positionId:'POS-006',date:'2026-09-04',amount:'47145.82',classification:'scheduled',economicEventKey:'payment-1',transferGroup:null}]};}
test('preview is admin-only, deterministic, never grants access and identifies duplicate economic events',()=>{
 for(const actor of [null,{id:'person',admin:false}])assert.throws(()=>previewInvestorImport(fixture(),actor),/Admin/);
 const r=previewInvestorImport(fixture(),admin);assert.equal(r.valid,true);assert.equal(r.writesPerformed,0);assert.equal(r.accessGrantsPerformed,0);assert.equal(r.sha256,previewInvestorImport(fixture(),admin).sha256);
 assert.ok(r.warnings.some(w=>w.includes('Identity mapping missing')));assert.ok(r.warnings.some(w=>w.includes('untrusted metadata')));assert.ok(r.warnings.some(w=>w.includes('Do not double count')));assert.ok(r.warnings.some(w=>w.includes('excluded from external cash-paid')));
 const input=fixture();input.people[0].getsLogin=false;input.positions[0].entityId='INV-006';input.holders.push(input.holders[0]);
 const invalid=previewInvestorImport(input,admin);assert.equal(invalid.valid,false);assert.ok(invalid.errors.some(e=>e.includes('gets_login=no')));assert.ok(invalid.errors.some(e=>e.includes('Unresolved position')));assert.ok(invalid.errors.some(e=>e.includes('Duplicate holders')));
});
test('dates and decimal money reject ambiguous values; Excel dates do not shift timezone',()=>{
 assert.equal(excelDateOnly(1),'1900-01-01');assert.equal(excelDateOnly(61),'1900-03-01');assert.equal(excelDateOnly(46269),'2026-09-04');assert.throws(()=>excelDateOnly(60));assert.throws(()=>excelDateOnly(46269.5));
 const input=fixture();input.events[0].amount='47145.819';assert.throws(()=>previewInvestorImport(input,admin));input.events[0].amount='47145.82';input.events[0].date='2026-02-30';assert.throws(()=>previewInvestorImport(input,admin));
});
