import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {InvestorReportRepository,reportAmount} from '../src/lib/investor-reports';
import {serveInvestorReport,serveInvestorDocument,reportCsv} from '../src/lib/investor-report-http';

test('report and download authorization: anonymous, unrelated, shared holder, admin, revocation, missing identity and release',async()=>{
 const pg=new PGlite();try{
  await pg.exec(await readFile(new URL('../migrations/001_property_content.sql',import.meta.url),'utf8'));
  assert.equal(await new InvestorReportRepository(embeddedDatabase(pg)).isReady(),false);
  const migration=await readFile(new URL('../migrations/018_investor_reporting.sql',import.meta.url),'utf8');
  // Exercise the same parameterized-query path as the local store, twice.
  for(let run=0;run<2;run++)for(const statement of migration.split('-- statement-break').filter(s=>s.replace(/^--.*$/gm,'').trim()))await pg.query(statement);
  const db=embeddedDatabase(pg),repo=new InvestorReportRepository(db);
  assert.equal(await repo.isReady(),true);
  const holder=randomUUID(),otherHolder=randomUUID(),position=randomUUID(),reserve=randomUUID(),report=randomUUID(),draft=randomUUID(),document=randomUUID();
  const first=randomUUID(),second=randomUUID(),outsider=randomUUID(),unmapped=randomUUID(),people=[randomUUID(),randomUUID(),randomUUID()];
  const a={id:first,admin:false},b={id:second,admin:false},other={id:outsider,admin:false},admin={id:'local-developer',admin:true};
  await db.query('INSERT INTO investment_holders(id,name) VALUES($1,$2),($3,$4)',[holder,'Shared holder',otherHolder,'Unrelated holder']);
  for(const [i,user] of [first,second,null].entries()){
   await db.query('INSERT INTO report_people(id,auth_user_id,source_id) VALUES($1,$2,$3)',[people[i],user,`PERSON-${i}`]);
   await db.query('INSERT INTO investor_access(person_id,holder_id,granted_by) VALUES($1,$2,$3)',[people[i],holder,'fixture']);
  }
  await db.query("INSERT INTO investment_positions(id,holder_id,project_name,name,kind) VALUES($1,$2,'Sutter Creek','Loan','loan'),($3,$2,'Reserve','Separate reserve','reserve')",[position,holder,reserve]);
  await db.query("INSERT INTO investor_reports(id,position_id,title,source_reference,released_at,released_by) VALUES($1,$2,'Draft source report','fixture',now(),'fixture')",[report,position]);
  await db.query("INSERT INTO investor_reports(id,position_id,title,source_reference) VALUES($1,$2,'Unreleased reserve','fixture')",[draft,reserve]);
  await db.query('INSERT INTO investor_report_documents(id,report_id,filename,content) VALUES($1,$2,$3,$4)',[document,report,'private.txt',Buffer.from('private document')]);
  await db.query("INSERT INTO investor_report_lines(id,report_id,section,label,amount,basis,source_reference) VALUES($1,$2,'position','Missing',NULL,'missing','fixture'),($3,$2,'transactions','Actual',0,'actual','fixture'),($4,$2,'transactions','=Unsafe label',2869.45,'projection','SCH-103')",[randomUUID(),report,randomUUID(),randomUUID()]);
  await db.query("INSERT INTO investor_report_findings(id,report_id,source_reference,description,source_value,comparison_value) VALUES($1,$2,'SCH-103','Day count discrepancy','2869.45','2837.92'),($3,$2,'SCH-104','Day count discrepancy','1436.63','1452.42'),($4,$2,'SCH-104','Forced zero differs by one cent','0.00','0.01')",[randomUUID(),report,randomUUID(),randomUUID()]);
  for(const [source,date] of [['Deal distribution waves','2026-11-30'],['Scott loan schedule','2026-12-04']])await db.query("INSERT INTO investor_report_schedules(id,report_id,source_reference,label,scheduled_date,note) VALUES($1,$2,$3,'Payment',$4,'Conflicting sources; confirmation required')",[randomUUID(),report,source,date]);
  for(const actor of [null,other,{id:unmapped,admin:false},{id:'invalid',admin:false}]){
   assert.deepEqual(await repo.list(actor),[]);assert.equal(await repo.get(report,actor),null);assert.equal(await repo.download(document,actor),null);
   for(const format of ['json','csv'] as const){const response=await serveInvestorReport(repo,report,actor,format);assert.equal(response.status,actor?404:401);assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.doesNotMatch(await response.text(),/2869|Shared holder/);}
   assert.equal((await serveInvestorDocument(repo,document,actor)).status,actor?404:401);
  }
  for(const actor of [a,b,admin]){
   const result=await repo.get(report,actor);assert.ok(result);assert.equal(result.review_state,'draft');assert.equal(result.lines.find(l=>l.basis==='projection')?.amount,'2869.45');
   assert.equal(result.findings.length,3);assert.equal(result.findings.find(f=>f.source_reference==='SCH-103')?.comparison_value,'2837.92');assert.ok(result.findings.every(f=>f.status==='pending'));
   assert.deepEqual(result.schedules.map(s=>s.scheduled_date),['2026-11-30','2026-12-04']);assert.ok(result.schedules.every(s=>s.confirmation==='pending'));
   const csv=reportCsv(result);assert.match(csv,/'=Unsafe label/);assert.match(csv,/not a replacement/);assert.match(csv,/Unaudited/);
   assert.equal((await serveInvestorReport(repo,report,actor,'csv')).status,200);
   const doc=await serveInvestorDocument(repo,document,actor);assert.equal(await doc.text(),'private document');assert.match(doc.headers.get('Content-Disposition')??'',/^attachment/);
  }
  assert.equal((await repo.list(a)).length,1);assert.equal((await repo.list(admin)).length,2);
  assert.equal(await repo.get(draft,a),null);assert.equal((await repo.get(draft,admin))?.kind,'reserve');
  await db.query('UPDATE investor_access SET revoked_at=now() WHERE person_id=$1',[people[0]]);
  assert.equal(await repo.get(report,a),null);assert.equal((await serveInvestorReport(repo,report,a,'csv')).status,404);assert.equal((await serveInvestorDocument(repo,document,a)).status,404);assert.ok(await repo.get(report,b));
  await db.query('UPDATE report_people SET disabled_at=now() WHERE id=$1',[people[1]]);assert.equal(await repo.get(report,b),null);
  await db.query('UPDATE report_people SET disabled_at=NULL WHERE id=$1',[people[1]]);
  await db.query('UPDATE investor_reports SET released_at=NULL,released_by=NULL WHERE id=$1',[report]);assert.equal(await repo.get(report,b),null);assert.equal(await repo.download(document,b),null);assert.ok(await repo.get(report,admin));
  assert.equal(await repo.get('not-a-uuid',admin),null);
  await assert.rejects(()=>db.query("INSERT INTO investor_report_lines(id,report_id,section,label,amount,basis,source_reference) VALUES($1,$2,'position','Wrong',NULL,'actual','fixture')",[randomUUID(),report]));
  await assert.rejects(()=>db.query("UPDATE investor_report_findings SET status='resolved' WHERE report_id=$1",[report]));
  const snapshot=randomUUID(),statement=randomUUID();
  await db.query("INSERT INTO investor_source_snapshots(id,source_key,sha256,source_filename,payload) VALUES($1,'fixture',$2,'fixture.json','{}')",[snapshot,'a'.repeat(64)]);
  await db.query("INSERT INTO investor_statement_snapshots(id,report_id,edition,source_snapshot_id,payload) VALUES($1,$2,1,$3,'{}')",[statement,report,snapshot]);
  for(const table of ['investor_source_snapshots','investor_statement_snapshots']){
   await assert.rejects(()=>db.query(`UPDATE ${table} SET payload='{"changed":true}'`),/immutable/);
   await assert.rejects(()=>db.query(`DELETE FROM ${table}`),/immutable/);
  }
  // Even accidental SELECT grants cannot bypass default-deny RLS in browser roles.
  await pg.exec('CREATE ROLE report_browser; GRANT USAGE ON SCHEMA public TO report_browser; GRANT SELECT ON ALL TABLES IN SCHEMA public TO report_browser; SET ROLE report_browser;');
  for(const table of ['report_people','investment_holders','investor_access','investment_positions','investor_reports','investor_report_lines','investor_report_schedules','investor_report_findings','investor_report_documents','investor_source_snapshots','investor_statement_snapshots','investment_entities','investment_position_terms','investment_loans','investment_events'])assert.equal((await pg.query(`SELECT * FROM ${table}`)).rows.length,0,table);
  await pg.exec('RESET ROLE');
 }finally{await pg.close();}
});
test('amount display preserves missing values, zeros, cents and large decimal precision',()=>{
 assert.equal(reportAmount(null,'USD'),'Not supplied');assert.equal(reportAmount('0.00','USD'),'USD 0.00');assert.equal(reportAmount('47145.82','USD'),'USD 47,145.82');assert.equal(reportAmount('999999999999999999.99','USD'),'USD 999,999,999,999,999,999.99');
});
