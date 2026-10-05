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
  await db.exec(await readFile(new URL('../migrations/013_group_documents.sql',import.meta.url),'utf8'));
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
