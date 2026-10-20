import {securitySchema} from './document-security-fixtures';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {PropertyRepository} from '../src/lib/repository';
import {MemberPropertyRepository} from '../src/lib/member-properties';
import {GroupDocumentRepository,audienceSchema,type GroupDocumentActor} from '../src/lib/group-documents';
import seeds from '../src/lib/seed-properties.json';

test('group documents enforce property and role audiences on both listing and downloading',async()=>{
 const db=new PGlite(),adapter=embeddedDatabase(db),admin:GroupDocumentActor={id:'test-admin',admin:true,roles:['admin']};
 const prospect:GroupDocumentActor={id:randomUUID(),admin:false,roles:['prospect']},owner:GroupDocumentActor={id:randomUUID(),admin:false,roles:['owner']},outside:GroupDocumentActor={id:randomUUID(),admin:false,roles:['prospect']};
 try{
  const properties=new PropertyRepository(adapter);await properties.initialize();const farm=await properties.create(seeds[0],admin.id),coast=await properties.create({...seeds[0],slug:'test-coast'},admin.id);
  const members=new MemberPropertyRepository(adapter);await members.initialize();await members.save(prospect.id,farm.id,['prospect'],admin);await members.save(owner.id,farm.id,['owner'],admin);await members.save(outside.id,coast.id,['prospect'],admin);
  await securitySchema(db);
  const repo=new GroupDocumentRepository(adapter),bytes=Buffer.from('Synthetic group document, no personal information.');
  const farmDoc=await repo.upload('farm.txt',bytes,['Role: Prospect'],{everyone:false,propertyIds:[farm.id],roles:[]},admin);
  const prospectDoc=await repo.upload('prospects.txt',bytes,[],{everyone:false,propertyIds:[],roles:['prospect']},admin);
  const combined=await repo.upload('farm-prospects.txt',bytes,[],{everyone:false,propertyIds:[farm.id],roles:['prospect']},admin);
  const everyone=await repo.upload('everyone.txt',bytes,[],{everyone:true,propertyIds:[],roles:[]},admin);
  const ids=async(actor:GroupDocumentActor)=>(await repo.listForMember(actor)).map(d=>d.id).sort();
  assert.deepEqual(await ids(prospect),[farmDoc.id,prospectDoc.id,combined.id,everyone.id].sort());
  assert.deepEqual(await ids(owner),[farmDoc.id,everyone.id].sort());
  assert.deepEqual(await ids(outside),[prospectDoc.id,everyone.id].sort());
  assert.equal(await repo.download(combined.id,owner),null);assert.equal(await repo.download(farmDoc.id,outside),null);
  assert.ok(await repo.download(combined.id,prospect));assert.ok(await repo.download(combined.id,admin));
  assert.equal('content' in (await repo.listAdmin(admin))[0],false);assert.equal('member_id' in farmDoc,false);
  assert.equal((await repo.listAdmin(admin)).length,4);
  await assert.rejects(repo.listAdmin(prospect),/Admin access/);
  await assert.rejects(repo.upload('no.txt',bytes,[],{everyone:true,propertyIds:[],roles:[]},prospect),/Admin access/);
  await assert.rejects(repo.update(combined.id,combined.version,[],{everyone:true,propertyIds:[],roles:[]},owner),/Admin access/);
  // Revoked membership immediately removes both list and direct-link access.
  await members.remove(prospect.id,farm.id,1,admin);
  assert.equal(await repo.download(combined.id,prospect),null);assert.deepEqual(await ids(prospect),[prospectDoc.id,everyone.id].sort());
  assert.equal(await repo.download(prospectDoc.id,{...prospect,roles:['member']}),null);
  // Audience edits take effect immediately; tags cannot broaden access.
  const updated=await repo.update(farmDoc.id,farmDoc.version,['Everyone'],{everyone:false,propertyIds:[coast.id],roles:['prospect']},admin);
  assert.equal(await repo.download(farmDoc.id,owner),null);assert.ok(await repo.download(farmDoc.id,outside));assert.equal(updated.version,2);
  await assert.rejects(repo.update(farmDoc.id,farmDoc.version,[],{everyone:true,propertyIds:[],roles:[]},admin),/changed/);
  await assert.rejects(repo.upload('missing.txt',bytes,[],{everyone:false,propertyIds:[randomUUID()],roles:[]},admin),/no longer exists/);
  assert.equal((await repo.listAdmin(admin)).length,4);
 }finally{await db.close();}
});

test('an audience cannot accidentally default to everyone or accept arbitrary user IDs',()=>{
 assert.equal(audienceSchema.safeParse({everyone:false,propertyIds:[],roles:[]}).success,false);
 assert.equal(audienceSchema.safeParse({everyone:true,propertyIds:[randomUUID()],roles:[]}).success,false);
 assert.equal(audienceSchema.safeParse({everyone:false,propertyIds:[],roles:['anything']}).success,false);
 assert.equal(audienceSchema.safeParse({memberId:randomUUID()}).success,false);
 assert.equal(audienceSchema.safeParse({everyone:false,propertyIds:[],roles:['prospect']}).success,true);
});

test('investment-derived property audiences apply to lists and downloads without granting unrelated roles or properties',async()=>{
 const db=new PGlite(),adapter=embeddedDatabase(db),admin:GroupDocumentActor={id:'test-admin',admin:true,roles:['admin']};
 const investor:GroupDocumentActor={id:randomUUID(),admin:false,roles:['member']};
 try{
 const properties=new PropertyRepository(adapter);await properties.initialize();
 const farm=await properties.create(seeds[0],admin.id),coast=await properties.create({...seeds[0],slug:'other-investment-property'},admin.id);
 await new MemberPropertyRepository(adapter).initialize();await securitySchema(db);
 await db.exec('CREATE TABLE prepared_members(id uuid PRIMARY KEY,auth_user_id uuid)');
 for(const name of ['018_investor_reporting.sql','019_investor_operations.sql','021_dashboard_preview.sql','022_investment_property_links.sql'])await db.exec(await readFile(new URL(`../migrations/${name}`,import.meta.url),'utf8'));
 const person=randomUUID(),holder=randomUUID(),entity=randomUUID();
 await db.query('INSERT INTO prepared_members VALUES($1,NULL)',[investor.id]);
 await db.query('INSERT INTO report_people(id,prepared_member_id) VALUES($1,$2)',[person,investor.id]);
 await db.query("INSERT INTO investment_holders(id,name) VALUES($1,'Trust')",[holder]);
 await db.query("INSERT INTO investment_entities(id,name,property_id) VALUES($1,'Farm',$2)",[entity,farm.id]);
 await db.query("INSERT INTO investor_access(person_id,holder_id,granted_by) VALUES($1,$2,'test')",[person,holder]);
 await db.query("INSERT INTO investment_positions(id,holder_id,entity_id,project_name,name,kind) VALUES($1,$2,$3,'Farm','Equity','equity')",[randomUUID(),holder,entity]);
 const repo=new GroupDocumentRepository(adapter),bytes=Buffer.from('Synthetic investor document');
 const make=(name:string,propertyIds:string[],roles:string[])=>repo.upload(name,bytes,[],{everyone:false,propertyIds,roles},admin);
 const allowed=await make('farm-investors.txt',[farm.id],['investor']);
 const propertyWide=await make('farm-all-members.txt',[farm.id],[]);
 const ownerOnly=await make('farm-owners.txt',[farm.id],['owner']);
 const other=await make('coast-investors.txt',[coast.id],['investor']);
 const globalOwners=await make('owners.txt',[],['owner']);
 assert.deepEqual((await repo.listForMember(investor)).map(d=>d.id).sort(),[allowed.id,propertyWide.id].sort());
 assert.ok(await repo.download(allowed.id,investor));
 for(const doc of [ownerOnly,other,globalOwners])assert.equal(await repo.download(doc.id,investor),null);
 assert.equal(await repo.download(allowed.id,{...investor,id:randomUUID()}),null);
 const linked=randomUUID();await db.query('UPDATE prepared_members SET auth_user_id=$1',[linked]);
 assert.equal(await repo.download(allowed.id,investor),null);
 const account={...investor,id:linked};assert.ok(await repo.download(allowed.id,account));
 await db.query('UPDATE report_people SET disabled_at=now()');assert.equal(await repo.download(allowed.id,account),null);
 await db.query('UPDATE report_people SET disabled_at=NULL');
 await db.query('UPDATE investor_access SET revoked_at=now()');
 assert.deepEqual(await repo.listForMember(account),[]);assert.equal(await repo.download(allowed.id,account),null);
 }finally{await db.close();}
});

test('editing group labels preserves audience and revocation on admin member lists',async()=>{
 const pg=new PGlite(),db=embeddedDatabase(pg),admin={id:'admin',admin:true,roles:['admin'] as ['admin']},member={id:randomUUID(),admin:false,roles:['prospect'] as ['prospect']};
 try{
  const properties=new PropertyRepository(db);await properties.initialize();const property=await properties.create(seeds[0],admin.id);
  const associations=new MemberPropertyRepository(db);await associations.initialize();await associations.save(member.id,property.id,['prospect'],admin);await securitySchema(pg);
  const repo=new GroupDocumentRepository(db),doc=await repo.upload('source.txt',Buffer.from('fixture'),[],{everyone:false,propertyIds:[property.id],roles:['prospect']},admin);
  await repo.upload('admin-only.txt',Buffer.from('fixture'),[],{everyone:false,propertyIds:[],roles:['admin']},admin);
  const saved=await repo.updateMetadata(doc.id,1,{displayName:'Property guide',notes:'Shared context',tags:[]},admin);
  assert.deepEqual(saved.property_ids,doc.property_ids);assert.deepEqual(saved.roles,doc.roles);assert.equal(saved.everyone,false);assert.equal(saved.filename,'source.txt');assert.equal(saved.version,2);
  assert.deepEqual((await repo.listForMember(member)).map(d=>d.id),[doc.id]);
  assert.equal((await repo.download(doc.id,member))?.content,Buffer.from('fixture').toString('base64'));
  await assert.rejects(repo.updateMetadata(doc.id,1,{displayName:'Stale',notes:'',tags:[]},admin),/changed/);
  await associations.remove(member.id,property.id,1,admin);assert.deepEqual(await repo.listForMember(member),[]);
 }finally{await pg.close();}
});
