import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {randomUUID} from 'node:crypto';
import {embeddedDatabase} from '../src/lib/database';
import {preparedMembersMigration} from '../src/lib/prepared-members';
import {previewMemberIdentity} from '../src/lib/dashboard-preview-identity';
import {readFile} from 'node:fs/promises';
import {InvestorPlatformRepository,stableInvestorId} from '../src/lib/investor-platform';
import {InvestorReportRepository} from '../src/lib/investor-reports';

test('dashboard identity uses explicit prepared mapping, removes admin rights, and fails closed on ambiguity',async()=>{
 const pg=new PGlite();try{
  const db=embeddedDatabase(pg);await pg.exec(preparedMembersMigration);
  const id=randomUUID(),person={id:randomUUID(),source_id:'PER-001',display_name:'Test person',auth_user_id:null,disabled_at:null};
  await db.query('INSERT INTO prepared_members(id,email,info,roles,created_by) VALUES($1,$2,$3,$4,$5)',[id,'fixture@example.test',{displayName:person.display_name},['member','investor','admin'],'test']);
  assert.equal(await previewMemberIdentity(db,person),null,'Matching names must not establish identity');
  const mapped={...person,prepared_member_id:id},identity=await previewMemberIdentity(db,mapped);
  assert.equal(identity?.memberId,id);assert.deepEqual(identity?.roles,['member','investor']);
  assert.equal(await previewMemberIdentity(db,{...person,prepared_member_id:randomUUID()}),null);
  await db.query('UPDATE prepared_members SET auth_user_id=$2 WHERE id=$1',[id,randomUUID()]);
  assert.equal(await previewMemberIdentity(db,{...mapped,auth_user_id:randomUUID()}),null,'Conflicting linked account IDs deny preview');
 }finally{await pg.close();}
});

test('global report scope never inherits admin authority or another member identity',async()=>{
 const pg=new PGlite();try{
  const db=embeddedDatabase(pg);await pg.exec('CREATE TABLE properties(id uuid PRIMARY KEY)');
  for(const file of ['018_investor_reporting.sql','019_investor_operations.sql','020_investor_source_files.sql','021_dashboard_preview.sql'])await pg.exec(await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8'));
  // Import a synthetic source with the required identities and no fabricated account grants.
  const books=fixture();
  const store=new InvestorPlatformRepository(db),admin={id:'test-admin',admin:true};await store.import(books,admin);
  const target=stableInvestorId('PER-001'),other=stableInvestorId('PER-007'),member={id:randomUUID(),admin:false};
  const scoped=new InvestorReportRepository(db,{person:true,draft:true,subjectId:target});
  const list=await scoped.list(member);assert.equal(list.length,1);assert.equal((await scoped.list(admin)).length,1);
  assert.deepEqual(await scoped.list(null),[]);
  const wrong=new InvestorReportRepository(db,{person:true,draft:true,subjectId:other});assert.equal(await wrong.get(list[0].id,admin),null);
  const releasedOnly=new InvestorReportRepository(db,{person:true,draft:false,subjectId:target});assert.deepEqual(await releasedOnly.list(member),[]);
  await store.setAccess(target,stableInvestorId('INV-001'),false,admin);assert.equal(await scoped.get(list[0].id,member),null);
 }finally{await pg.close();}
});

function fixture(){return [{filename:'synthetic.xlsx',tabs:[
 {name:'people',rows:[{person_id:'PER-001'},{person_id:'PER-007'}]},
 {name:'investor_access',rows:[{person_id:'PER-001',investor_id:'INV-001'},{person_id:'PER-007',investor_id:'INV-005'}]},
 {name:'investors',rows:[{investor_id:'INV-001',display_name:'Trust'},{investor_id:'INV-005',display_name:'Scott'}]},
 {name:'entities',rows:[{entity_id:'ENT-NC',entity_name:'Norden'},{entity_id:'ENT-SC',entity_name:'Sutter'},{entity_id:'ENT-LCR',entity_name:'Reserve'}]},
 {name:'positions',rows:[{position_id:'POS-001',investor_id:'INV-001',entity_id:'ENT-NC',position_type:'equity',commitment_amount:'250000',start_date:'2025-05-02'},{position_id:'POS-006',investor_id:'INV-005',entity_id:'ENT-NC',position_type:'loan'},{position_id:'POS-101',investor_id:'INV-005',entity_id:'ENT-SC',role:'lender'},{position_id:'POS-102',investor_id:'INV-005',entity_id:'ENT-LCR',investment_type:'reserve',amount:'47145.82',rate:'0.1',start_date:'2026-09-04'}]},
 {name:'transactions',rows:[{txn_id:'TXN-1003',position_id:'POS-101',txn_date:'2026-09-04',amount:'47145.82',direction:'to_investor',txn_type:'loan_payment'},{txn_id:'TXN-1004',position_id:'POS-102',txn_date:'2026-09-04',amount:'47145.82',direction:'to_entity',txn_type:'reserve_deposit'}]},
 {name:'capital_account_snapshots',rows:[{position_id:'POS-001',capital_outstanding:'150000',pref_unpaid:'32328.76',as_of_date:'2026-10-16'}]}
 ]}];}
