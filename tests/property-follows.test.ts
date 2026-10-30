import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {PropertyRepository} from '../src/lib/repository';
import {PropertyFollowRepository,automaticallyFollowing} from '../src/lib/property-follows';
import {readFollowRequest} from '../src/lib/property-follow-request';
import {MemberPropertyRepository} from '../src/lib/member-properties';
import {memberPropertyPresentation} from '../src/lib/member-property-presentation';
import {GroupDocumentRepository} from '../src/lib/group-documents';
import {securitySchema} from './document-security-fixtures';
import {readDraft} from '../src/lib/schema';
import seeds from '../src/lib/seed-properties.json';
const migrate=async(pg:PGlite,file:string)=>pg.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));

test('explicit following is idempotent, isolated, published-only and never grants restricted documents',async()=>{
 const pg=new PGlite();try{
  const db=embeddedDatabase(pg),properties=new PropertyRepository(db);await properties.initialize();
  await new MemberPropertyRepository(db).initialize();await pg.exec('CREATE TABLE prepared_members(id uuid PRIMARY KEY,auth_user_id uuid,status text)');
  await migrate(pg,'028_property_follows.sql');await migrate(pg,'028_property_follows.sql');await securitySchema(pg);
  const follow=new PropertyFollowRepository(db),member={id:randomUUID(),admin:false,roles:[]},other={...member,id:randomUUID()},admin={id:'test-admin',admin:true};
  let property=await properties.create({...seeds[0],offeringStatus:'Fully Subscribed'},admin.id);
  assert.deepEqual(await follow.list(member.id),[]);
  await assert.rejects(follow.set(member,property.id,true),/no longer available/);
  property=await properties.publish(property.id,property.version,admin.id);
  const docs=new GroupDocumentRepository(db),doc=await docs.upload('private.txt',Buffer.from('Private fixture'),[],{everyone:false,propertyIds:[property.id],roles:[]},admin);
  await Promise.all([follow.set(member,property.id,true),follow.set(member,property.id,true)]);
  assert.deepEqual(await follow.list(member.id),[property.id]);assert.deepEqual(await follow.list(other.id),[]);
  assert.equal((await db.query('SELECT * FROM member_properties')).rows.length,0);
  assert.deepEqual(await docs.listForMember(member),[]);assert.equal(await docs.download(doc.id,member),null);
  const visible=await memberPropertyPresentation([],[],id=>properties.get(id),await follow.list(member.id));
  assert.equal(visible[0].following,true);assert.deepEqual(visible[0].roles,[]);assert.equal(visible[0].property.offeringStatus,'Fully Subscribed');
  const before=await follow.list(member.id);await assert.rejects(follow.set({...member,preview:{}},property.id,false),/read-only/);assert.deepEqual(await follow.list(member.id),before);
  await properties.unpublish(property.id,property.version,admin.id);
  assert.deepEqual(await memberPropertyPresentation([],[],id=>properties.get(id),await follow.list(member.id)),[]);
  await assert.rejects(follow.set(member,property.id,true),/no longer available/);
  await follow.set(member,property.id,false);await follow.set(member,property.id,false);assert.deepEqual(await follow.list(member.id),[]);
  property=(await properties.get(property.id))!;property=await properties.publish(property.id,property.version,admin.id);
  await follow.set(other,property.id,true);await properties.delete(property.id,property.version);assert.deepEqual(await follow.list(other.id),[]);
 }finally{await pg.close();}
});

test('automatic roles retain multiple labels, follow live grants, and legacy/guest relationships preserve access separately',async()=>{
 const pg=new PGlite();try{
  const db=embeddedDatabase(pg),properties=new PropertyRepository(db);await properties.initialize();
  const members=new MemberPropertyRepository(db);await members.initialize();await pg.exec('CREATE TABLE prepared_members(id uuid PRIMARY KEY,auth_user_id uuid,status text)');
  for(const file of ['028_property_follows.sql','018_investor_reporting.sql','019_investor_operations.sql','021_dashboard_preview.sql','022_investment_property_links.sql'])await migrate(pg,file);
  const follow=new PropertyFollowRepository(db),member={id:randomUUID()},admin={id:'admin',admin:true},p=await properties.create(seeds[0],admin.id);
  for(const role of ['investor','owner','manager'] as const){
   await db.query('DELETE FROM member_properties');await members.save(member.id,p.id,[role,'guest'],admin);
   assert.equal(await follow.automatic(member.id,p.id),true);
   await follow.set(member,p.id,true);assert.deepEqual(await follow.list(member.id),[],'Do not materialize automatic follows');
   await assert.rejects(follow.set(member,p.id,false),/automatically followed/);
   const presentation=await memberPropertyPresentation(await members.list(member.id),[],id=>properties.get(id));
   assert.deepEqual(presentation[0].roles,[role,'guest']);assert.equal(presentation[0].automaticFollow,true);assert.equal(presentation[0].unpublished,true);
  }
  await db.query('DELETE FROM member_properties');await members.save(member.id,p.id,['prospect','guest'],admin);
  assert.equal(await follow.automatic(member.id,p.id),false);
  let presentation=await memberPropertyPresentation(await members.list(member.id),[],id=>properties.get(id));assert.equal(presentation.length,1);assert.equal(presentation[0].following,false);
  presentation=await memberPropertyPresentation([],[{id:p.id,kind:'property'}],id=>properties.get(id));assert.equal(presentation[0].selectionOnly,true);assert.equal(presentation[0].following,false);assert.deepEqual(presentation[0].roles,[]);
  const person=randomUUID(),holder=randomUUID(),entity=randomUUID();
  await db.query('INSERT INTO report_people(id,auth_user_id) VALUES($1,$2)',[person,member.id]);
  await db.query("INSERT INTO investment_holders(id,name) VALUES($1,'Trust')",[holder]);await db.query("INSERT INTO investment_entities(id,name,property_id) VALUES($1,'Project',$2)",[entity,p.id]);
  await db.query("INSERT INTO investor_access(person_id,holder_id,granted_by) VALUES($1,$2,'test')",[person,holder]);
  await db.query("INSERT INTO investment_positions(id,holder_id,entity_id,project_name,name,kind) VALUES($1,$2,$3,'Project','Position','equity')",[randomUUID(),holder,entity]);
  assert.equal(await follow.automatic(member.id,p.id),true);await assert.rejects(follow.set(member,p.id,false),/automatically followed/);
  await db.query('UPDATE investor_access SET revoked_at=now()');assert.equal(await follow.automatic(member.id,p.id),false);assert.deepEqual(await follow.list(member.id),[]);
 }finally{await pg.close();}
});

test('follow mutation rejects unauthenticated, cross-origin, View As, malformed and impersonated requests',async()=>{
 const id=randomUUID(),actor={id:randomUUID()},body={propertyId:id,following:true};
 const request=(data:unknown=body,origin='http://localhost:3000')=>new Request('http://localhost:3000/api/property-follows',{method:'PUT',headers:{host:'localhost:3000',origin},body:JSON.stringify(data)});
 assert.deepEqual(await readFollowRequest(request(),actor),body);
 await assert.rejects(readFollowRequest(request(),null),/sign in/);
 await assert.rejects(readFollowRequest(request(),{...actor,preview:{}}),/read-only/);
 await assert.rejects(readFollowRequest(request(body,'https://evil.test'),actor),/origin/);
 await assert.rejects(readFollowRequest(request({...body,userId:randomUUID()}),actor));
 await assert.rejects(readFollowRequest(request({...body,following:'yes'}),actor));
 await assert.rejects(readFollowRequest(request('x'.repeat(2048)),actor),/Invalid follow/);
 assert.equal(automaticallyFollowing(['prospect','guest']),false);
});
