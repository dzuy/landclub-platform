import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {InvestorPlatformRepository,stableInvestorId,preparePlatformImport} from '../src/lib/investor-platform';
import {InvestorReportRepository} from '../src/lib/investor-reports';
import {simpleAccrual,loanInterest,fixedDenominatorShare} from '../src/lib/investor-calculations';
const actor={id:'administrator',admin:true};
function fixture(){return [{filename:'synthetic.xlsx',tabs:[
 {name:'people',rows:[{person_id:'PER-001'},{person_id:'PER-007'}]},
 {name:'investor_access',rows:[{person_id:'PER-001',investor_id:'INV-001'},{person_id:'PER-007',investor_id:'INV-005'}]},
 {name:'investors',rows:[{investor_id:'INV-001',display_name:'Trust'},{investor_id:'INV-005',display_name:'Scott'}]},
 {name:'entities',rows:[{entity_id:'ENT-NC',entity_name:'Norden'},{entity_id:'ENT-SC',entity_name:'Sutter'},{entity_id:'ENT-LCR',entity_name:'Reserve'}]},
 {name:'positions',rows:[{position_id:'POS-001',investor_id:'INV-001',entity_id:'ENT-NC',position_type:'equity',commitment_amount:'250000',start_date:'2025-05-02'},{position_id:'POS-006',investor_id:'INV-005',entity_id:'ENT-NC',position_type:'loan'},{position_id:'POS-101',investor_id:'INV-005',entity_id:'ENT-SC',role:'lender'},{position_id:'POS-102',investor_id:'INV-005',entity_id:'ENT-LCR',investment_type:'reserve',amount:'47145.82',rate:'0.1',start_date:'2026-09-04'}]},
 {name:'transactions',rows:[{txn_id:'TXN-1003',position_id:'POS-101',txn_date:'2026-09-04',amount:'47145.82',direction:'to_investor',txn_type:'loan_payment'},{txn_id:'TXN-1004',position_id:'POS-102',txn_date:'2026-09-04',amount:'47145.82',direction:'to_entity',txn_type:'reserve_deposit'}]},
 {name:'capital_account_snapshots',rows:[{position_id:'POS-001',capital_outstanding:'150000',pref_unpaid:'32328.76',as_of_date:'2026-10-16'}]}
 ]}];}
test('import, preview, release, revocation, account mapping and immutable editions use real SQL',async()=>{
 const pg=new PGlite();try{
  await pg.exec('CREATE TABLE properties(id uuid PRIMARY KEY)');
  for(let run=0;run<2;run++)for(const file of ['018_investor_reporting.sql','019_investor_operations.sql','020_investor_source_files.sql'])for(const sql of (await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8')).split('-- statement-break').filter(s=>s.trim()))await pg.query(sql);
  const db=embeddedDatabase(pg),store=new InvestorPlatformRepository(db);
  assert.equal((await store.import(fixture(),actor)).imported,true);assert.equal((await store.import(fixture(),actor)).imported,false);
  const sourceId=(await db.query<{id:string}>('SELECT id FROM investor_source_snapshots')).rows[0].id;
  const fileId=randomUUID(),fileBytes=Buffer.from('isolated evidence bytes');
  await db.query('INSERT INTO investor_source_files(id,snapshot_id,filename,sha256,content) VALUES($1,$2,$3,$4,$5)',[fileId,sourceId,'test.xlsx','a'.repeat(64),fileBytes]);
  assert.deepEqual(Buffer.from((await db.query<{content:Uint8Array}>('SELECT content FROM investor_source_files WHERE id=$1',[fileId])).rows[0].content),fileBytes);
  await assert.rejects(()=>db.query('DELETE FROM investor_source_files WHERE id=$1',[fileId]),/immutable/);
  assert.equal((await db.query<{relrowsecurity:boolean}>("SELECT relrowsecurity FROM pg_class WHERE relname='investor_source_files'")).rows[0].relrowsecurity,true);
  assert.equal((await store.people(actor)).length,2);assert.equal((await db.query('SELECT * FROM investment_positions')).rows.length,4);
  assert.equal((await db.query("SELECT * FROM investment_events WHERE classification='internal_transfer'")).rows.length,2);
  await assert.rejects(()=>store.beginPreview(stableInvestorId('PER-001'),'investor',{id:randomUUID(),admin:false}));
  const token=await store.beginPreview(stableInvestorId('PER-001'),'investor',actor),draft=await store.beginPreview(stableInvestorId('PER-001'),'draft',actor),scott=await store.beginPreview(stableInvestorId('PER-007'),'draft',actor);
  const p=(await store.preview(token,actor))!,d=(await store.preview(draft,actor))!,s=(await store.preview(scott,actor))!;
  assert.equal((await p.repo.list(p.actor)).length,0);assert.equal((await d.repo.list(d.actor)).length,1);assert.equal((await s.repo.list(s.actor)).length,3);
  assert.equal(await store.preview(draft,{id:'different-admin',admin:true}),null);
  const id=(await d.repo.list(d.actor))[0].id;assert.equal(await s.repo.get(id,s.actor),null);
  await assert.rejects(()=>store.publication(id,'release',actor),/Resolve/);
  const report=(await d.repo.get(id,d.actor))!;for(const f of report.findings)await store.resolve(f.id,'Synthetic test evidence confirmed only for this isolated test.',actor);
  await store.publication(id,'review',actor);await store.publication(id,'release',actor);assert.equal((await p.repo.list(p.actor)).length,1);
  const uid=randomUUID();await store.mapAccount(p.person.id,uid,actor);assert.equal((await new InvestorReportRepository(db).list({id:uid,admin:false})).length,1);
  const statement=await store.statement(id,actor);assert.ok(statement);await assert.rejects(()=>db.query('DELETE FROM investor_statement_snapshots WHERE id=$1',[statement]),/immutable/);
  await assert.rejects(()=>db.query('DELETE FROM investor_operations_audit'),/append-only/);
  await store.setAccess(p.person.id,stableInvestorId('INV-001'),false,actor);assert.equal((await p.repo.list(p.actor)).length,0);assert.equal((await d.repo.list(d.actor)).length,0);
  await store.import(fixture(),actor);assert.equal((await d.repo.list(d.actor)).length,0);
  await store.setAccess(p.person.id,stableInvestorId('INV-001'),true,actor);await store.publication(id,'withdraw',actor);assert.equal((await p.repo.list(p.actor)).length,0);
  await store.endPreview(draft,actor);assert.equal(await store.preview(draft,actor),null);
  await db.query("UPDATE investor_preview_sessions SET expires_at=now()-interval '1 minute'");assert.equal(await store.preview(token,actor),null);
  const updated=fixture();updated[0].filename='second-version.xlsx';await store.import(updated,actor);assert.equal((await db.query('SELECT * FROM investor_reports')).rows.length,8);assert.equal((await db.query('SELECT * FROM investment_events')).rows.length,2);assert.equal((await db.query('SELECT * FROM investor_statement_snapshots')).rows.length,1);
 }finally{await pg.close();}
});
test('source import rejects missing access and validates actual workbook locally when available',async t=>{
 const bad=fixture();bad[0].tabs=bad[0].tabs.filter(t=>t.name!=='investor_access');assert.throws(()=>preparePlatformImport(bad),/relationships/);
 let text:string;try{text=await readFile(new URL('../.data/investor-review/workbooks.json',import.meta.url),'utf8');}catch{t.diagnostic('Private fixture unavailable; synthetic contract covered.');return;}
 assert.equal(preparePlatformImport(JSON.parse(text)).reports.length,4);
});
test('decimal accrual matches check figures and distinguishes prepaid interest',()=>{
 const equity=simpleAccrual([{date:'2025-05-02',amount:'250000.00'},{date:'2026-05-19',amount:'-100000.00'}],'2026-10-16',1000,'segments');assert.equal(equity.accrued,'32328.76');assert.equal(equity.principal,'150000.00');
 assert.equal(simpleAccrual([{date:'2026-09-04',amount:'47145.82'}],'2026-10-16',1000).accrued,'542.50');
 const loan=loanInterest([{date:'2026-05-15',amount:'125000.00'}],'6250.00','2026-10-16',1000);assert.equal(loan.accrued,'5273.97');assert.equal(loan.prepaid,'976.03');assert.equal(loan.unpaid,'0.00');
 assert.equal(fixedDenominatorShare('176216.00','470353.00','1186248.00'),'69870.49');
 assert.equal(simpleAccrual([{date:'2026-10-16',amount:'100.00'}],'2026-10-16',1000).accrued,'0.00');
 assert.throws(()=>simpleAccrual([{date:'2026-02-30',amount:'100.00'}],'2026-10-16',1000));
 assert.throws(()=>simpleAccrual([{date:'2026-10-17',amount:'100.00'}],'2026-10-16',1000));
 assert.throws(()=>simpleAccrual([{date:'2026-10-16',amount:'-1.00'}],'2026-10-16',1000));
});
