import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {InvestorPlatformRepository,stableInvestorId} from '../src/lib/investor-platform';
import {nordenCompanyReport} from '../src/lib/investor-company-report';
import {cents} from '../src/lib/investor-calculations';

test('company source maps exact cents, reconciles spending, and excludes personal rows',async t=>{
 let books;try{books=JSON.parse(await readFile(new URL('../.data/investor-review/workbooks.json',import.meta.url),'utf8'));}catch{t.skip('Private source workbook is not available.');return;}
 const r=nordenCompanyReport(books)!;
 assert.equal(r.cash,'65671.67');assert.equal(r.previousCash,'803.00');assert.equal(r.cashChange,'64868.67');
 assert.equal(r.totalAssets,'864404.67');assert.equal(r.totalLiabilities,'767550.00');assert.equal(r.equity,'96854.67');
 assert.equal(cents(r.totalLiabilities)+cents(r.equity),cents(r.totalAssets));
 assert.equal(r.assets.reduce((sum,v)=>sum+cents(v.amount),0n),cents(r.totalAssets));
 assert.equal(r.totalSpending,'148181.33');assert.deepEqual(r.spending.map(v=>v.amount),['69125.64','35627.20','4438.49','28905.00','10085.00']);
 assert.equal(r.spending.reduce((sum,v)=>sum+cents(v.amount),0n),cents(r.totalSpending));
 assert.doesNotMatch(JSON.stringify(r),/mailing_address|Michael Farrauto|James Sutton|6398|Scott Jeeves/);
 const changed=structuredClone(books),balance=changed.find((b:{filename:string})=>b.filename===r.source).tabs.find((t:{name:string})=>t.name==='Balance Sheet');
 balance.rows.find((v:Record<string,string>)=>v['Unnamed: 2']==='Cash - Wells Fargo (x6398)')['Unnamed: 3']='1.23';
 assert.equal(nordenCompanyReport(changed)!.cash,'1.23','cash is sourced, not a mock constant');
 const spending=changed.find((b:{filename:string})=>b.filename===r.source).tabs.find((t:{name:string})=>t.name==='Spending 4-1 to 10-16');
 spending.rows.find((v:Record<string,string>)=>Object.values(v).includes('Total spending'))['Unnamed: 1']='1';
 assert.throws(()=>nordenCompanyReport(changed),/reconcile/);
 const pg=new PGlite();try{
  await pg.exec('CREATE TABLE properties(id uuid PRIMARY KEY)');
  for(const f of ['018_investor_reporting.sql','019_investor_operations.sql'])for(const sql of (await readFile(new URL(`../migrations/${f}`,import.meta.url),'utf8')).split('-- statement-break').filter(s=>s.trim()))await pg.query(sql);
  const store=new InvestorPlatformRepository(embeddedDatabase(pg)),admin={id:'test-admin',admin:true};await store.import(books,admin);
  const token=await store.beginPreview(stableInvestorId('PER-001'),'draft',admin),ian=(await store.preview(token,admin))!;
  const id=(await ian.repo.list(ian.actor))[0].id;
  assert.equal((await ian.repo.company(id,ian.actor))?.cash,r.cash);
  assert.equal(await ian.repo.company(id,null),null);
  const scott=(await store.preview(await store.beginPreview(stableInvestorId('PER-007'),'draft',admin),admin))!;
  assert.equal(await scott.repo.company(id,scott.actor),null);
  const scottReports=await scott.repo.list(scott.actor);
  for(const report of scottReports)assert.equal(!!await scott.repo.company(report.id,scott.actor),report.project_name.includes('Norden'));
  const released=(await store.preview(await store.beginPreview(stableInvestorId('PER-001'),'investor',admin),admin))!;
  assert.equal(await released.repo.company(id,released.actor),null);
  await store.setAccess(ian.person.id,stableInvestorId('INV-001'),false,admin);
  assert.equal(await ian.repo.company(id,ian.actor),null);
 }finally{await pg.close();}
});
test('unrelated or missing company evidence cannot fall back to mock figures',()=>{assert.equal(nordenCompanyReport([]),null);assert.throws(()=>nordenCompanyReport([{filename:'Land_Club_Norden_Cross_Balance_Sheet_10-16-2026_Draft_v2.xlsx',tabs:[]}]),/incomplete/);});
