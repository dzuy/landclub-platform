import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {InvestmentTermsRepository} from '../src/lib/investment-terms-repository';
import {calculateTerms,confirmationIssues,termsSchema,type Terms,type Revision} from '../src/lib/investment-terms';
const terms:Terms={kind:'loan',principal:'10000.00',currency:'USD',start:'2026-01-01',effective:'2026-01-01',rateBps:800,method:'simple',dayCount:'Actual/365',frequency:'none',paymentSchedule:'At maturity',maturity:null,conditions:'',sourceReference:'Synthetic agreement page 1 section 2',unresolved:'',agreementId:null};
const revision=(t=terms,version=1):Revision=>({id:randomUUID(),version,confirmed:true,terms:t});
test('date changes, future activity, capital changes, prepaid and effective-dated rates',()=>{
 assert.equal(calculateTerms([],[],'2026-02-01').available,false);
 assert.equal(calculateTerms([{...revision(),confirmed:false}],[],'2026-02-01').available,false);
 const a=calculateTerms([revision()],[],'2026-02-01');assert.ok(a.available);assert.equal(a.accrued,'67.95');
 const b=calculateTerms([revision()],[{kind:'principal_repayment',date:'2026-02-01',amount:'1000.00',sourceReference:'Synthetic receipt',sourceEventId:null},{kind:'interest_payment',date:'2026-02-01',amount:'100.00',sourceReference:'Synthetic receipt 2',sourceEventId:null},{kind:'contribution',date:'2027-01-01',amount:'999.00',sourceReference:'Future',sourceEventId:null}],'2026-02-01');assert.ok(b.available);assert.equal(b.principal,'9000.00');assert.equal(b.prepaid,'32.05');
 const c=calculateTerms([revision(),revision({...terms,effective:'2026-02-01',rateBps:1000},2)],[{kind:'contribution',date:'2026-02-01',amount:'1000.00',sourceReference:'Receipt',sourceEventId:null}],'2026-03-01');assert.ok(c.available);assert.equal(c.principal,'11000.00');assert.equal(c.accrued,'152.33');
 assert.throws(()=>calculateTerms([revision()],[],'2026-02-30'));
 for(const t of [{...terms,kind:'equity' as const},{...terms,method:'compound' as const,frequency:'monthly' as const},{...terms,dayCount:'Actual/360' as const},{...terms,conditions:'Conditional rate'},{...terms,unresolved:'Missing signature'},{...terms,maturity:'2026-01-15'}])assert.equal(calculateTerms([revision(t)],[],'2026-02-01').available,false);
 assert.throws(()=>termsSchema.parse({...terms,start:'2026-02-30'}));
});
test('SQL review flow locks stale confirmation, preserves evidence, denies unrelated users and gates report release',async()=>{
 const pg=new PGlite();try{
 await pg.exec('CREATE TABLE properties(id uuid PRIMARY KEY)');
 for(const f of ['018_investor_reporting.sql','019_investor_operations.sql','020_investor_source_files.sql','026_investment_reviewed_terms.sql'])for(const sql of (await readFile(`migrations/${f}`,'utf8')).split('-- statement-break').filter(v=>v.trim()))await pg.query(sql);
 const db=embeddedDatabase(pg),repo=new InvestmentTermsRepository(db),admin={id:'test-admin',admin:true},owner={id:randomUUID(),admin:false},stranger={id:randomUUID(),admin:false},position=randomUUID(),holder=randomUUID(),person=randomUUID(),report=randomUUID();
 await db.query('INSERT INTO investment_holders(id,name) VALUES($1,$2)',[holder,'Synthetic holder']);await db.query("INSERT INTO investment_positions(id,holder_id,project_name,name,kind) VALUES($1,$2,'Synthetic','Fixture loan','loan')",[position,holder]);
 await db.query('INSERT INTO report_people(id,auth_user_id) VALUES($1,$2)',[person,owner.id]);await db.query("INSERT INTO investor_access(person_id,holder_id,granted_by) VALUES($1,$2,'fixture')",[person,holder]);
 await db.query("INSERT INTO investor_reports(id,position_id,title,source_reference) VALUES($1,$2,'Synthetic','Fixture')",[report,position]);
 await assert.rejects(()=>repo.read(position,stranger),/Admin/);await assert.rejects(()=>repo.save(position,terms,0,stranger),/Admin/);await assert.rejects(()=>repo.attach(position,'fixture.pdf',Buffer.from('%PDF-1.7 synthetic'),stranger),/Admin/);
 const agreement=await repo.attach(position,'synthetic.pdf',await readFile('tests/fixtures/synthetic-investment-agreement.pdf'),admin);assert.equal((await repo.download(agreement,admin))?.filename,'synthetic.pdf');
 const t={...terms,agreementId:agreement};await repo.save(position,t,0,admin);assert.equal((await repo.read(position,admin)).history[0].confirmed,false);
 const preview=await repo.preview(position,t,'2026-02-01',admin);
 await repo.transaction(position,{date:'2026-01-20',amount:'10.00',kind:'interest_payment',sourceReference:'Synthetic receipt',sourceEventId:null},admin);
 await assert.rejects(()=>repo.save(position,t,1,admin,{asOf:'2026-02-01',digest:preview.digest}),/Preview changed/);
 const fresh=await repo.preview(position,t,'2026-02-01',admin);await repo.save(position,t,1,admin,{asOf:'2026-02-01',digest:fresh.digest});
 assert.equal(await repo.forReport(report,'2026-02-01',owner),null);await db.query("UPDATE investor_reports SET review_state='reviewed',released_at=now(),released_by='fixture' WHERE id=$1",[report]);
 assert.equal(await repo.forReport(report,'2026-02-01',stranger),null);assert.equal((await repo.forReport(report,'2026-02-01',owner))?.available,true);
 // Admin View As is bound to its existing session, including prepared-only people.
 const token='a'.repeat(64),hash=createHash('sha256').update(token).digest('hex');
 await db.query("INSERT INTO investor_preview_sessions(token_hash,admin_id,person_id,mode,expires_at) VALUES($1,$2,$3,'draft',now()+interval '10 minutes')",[hash,admin.id,person]);
 await db.query('UPDATE report_people SET auth_user_id=NULL WHERE id=$1',[person]);
 assert.equal((await repo.forPreview(report,'2026-02-01',token,admin))?.available,true);
 assert.equal(await repo.forReport(report,'2026-02-01',owner),null,'Preview must not establish a normal investor identity');
 assert.equal(await repo.forPreview(report,'2026-02-01',token,owner),null);
 assert.equal(await repo.forPreview(report,'2026-02-01',token,{id:'another-admin',admin:true}),null);
 assert.equal(await repo.forPreview(randomUUID(),'2026-02-01',token,admin),null);
 await db.query('UPDATE investor_preview_sessions SET ended_at=now() WHERE token_hash=$1',[hash]);
 assert.equal(await repo.forPreview(report,'2026-02-01',token,admin),null);
 await db.query("UPDATE investor_preview_sessions SET ended_at=NULL,expires_at=now()-interval '1 minute' WHERE token_hash=$1",[hash]);
 assert.equal(await repo.forPreview(report,'2026-02-01',token,admin),null);
 await db.query("UPDATE investor_preview_sessions SET expires_at=now()+interval '1 minute' WHERE token_hash=$1",[hash]);
 await db.query('UPDATE report_people SET disabled_at=now() WHERE id=$1',[person]);
 assert.equal(await repo.forPreview(report,'2026-02-01',token,admin),null);
 await db.query('UPDATE report_people SET disabled_at=NULL,auth_user_id=$2 WHERE id=$1',[person,owner.id]);
 await db.query('UPDATE investor_access SET revoked_at=now()');assert.equal(await repo.forReport(report,'2026-02-01',owner),null);assert.equal(await repo.forPreview(report,'2026-02-01',token,admin),null);
 await assert.rejects(()=>db.query('DELETE FROM investment_term_revisions'),/append-only/);
 await assert.rejects(()=>repo.save(position,t,0,admin),/Terms changed/);
 await assert.rejects(()=>repo.preview(position,t,'2026-02-01',admin),/Amendments/);
 }finally{await pg.close();}
});

test('incomplete drafts retain unknowns, equity does not require invented loan fields, and dates are actual calendar days',()=>{
 const draft=termsSchema.parse({kind:'equity',unresolved:'Awaiting agreement'});assert.equal(draft.rateBps,null);assert.equal(draft.principal,null);assert.ok(confirmationIssues(draft).length>0);
 const equity=termsSchema.parse({...terms,kind:'equity',method:null,rateBps:null,frequency:null,dayCount:null,paymentSchedule:''});assert.equal(confirmationIssues(equity).length,0);assert.equal(calculateTerms([revision(equity)],[],'2026-03-01').available,false);
 const leap={...terms,start:'2024-02-28',effective:'2024-02-28'};const result=calculateTerms([revision(leap)],[],'2024-03-01');assert.ok(result.available);assert.equal(result.accrued,'4.38');
 const extension=calculateTerms([revision({...terms,maturity:'2026-02-01'}),revision({...terms,effective:'2026-02-01',maturity:'2026-12-31'},2)],[],'2026-03-01');assert.ok(extension.available);
 assert.throws(()=>calculateTerms([revision()],[{date:'2026-02-01',amount:'10001.00',kind:'principal_repayment',sourceReference:'Synthetic overpayment',sourceEventId:null}],'2026-03-01'),/negative/);
});
