import seeds from '../src/lib/seed-properties.json';
import {memberPropertyPresentation} from '../src/lib/member-property-presentation';
import {PropertyRepository} from '../src/lib/repository';
import {securitySchema} from './document-security-fixtures';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {MemberInvestmentRepository} from '../src/lib/member-investments';
import {MemberPropertyRepository} from '../src/lib/member-properties';
import {GroupDocumentRepository} from '../src/lib/group-documents';

test('saved selections appear in property presentation but never confer property roles or document access',async()=>{
 const pg=new PGlite();try{
  for(const name of ['001_property_content','006_member_properties','007_multiple_property_roles','013_group_documents','016_member_investments'])await pg.exec(await readFile(new URL(`../migrations/${name}.sql`,import.meta.url),'utf8'));
  await securitySchema(pg);
  const db=embeddedDatabase(pg),repo=new MemberInvestmentRepository(db),properties=new MemberPropertyRepository(db),documents=new GroupDocumentRepository(db);
  const user=randomUUID(),other=randomUUID(),property=randomUUID(),admin={id:'admin',admin:true};
  await db.query('INSERT INTO properties(id,draft) VALUES($1,$2)',[property,JSON.stringify({...seeds[0],name:'Test property',slug:'test'})]);
  await properties.save(other,property,['guest'],admin);
  const doc=await documents.upload('test.txt',Buffer.from('fixture'),[],{everyone:false,propertyIds:[property],roles:[]},admin);
  const entities=[{kind:'company',id:'land-club-llc'},{kind:'property',id:property}];
  await assert.rejects(()=>repo.save(user,entities,0,{id:user,admin:false}),/Admin/);
  const saved=await repo.save(user,[...entities,entities[0]],0,admin);assert.equal(saved.entities.length,2);
  const visible=await memberPropertyPresentation(await properties.list(user),(await repo.get(user)).entities,id=>new PropertyRepository(db).get(id));
  assert.deepEqual(visible.map(p=>p.id),[property]);assert.deepEqual(visible[0].roles,[]);assert.equal(visible[0].selectionOnly,true);
  assert.deepEqual(await properties.list(user),[]);assert.equal((await properties.list(other))[0].roles[0],'guest');
  assert.equal(await documents.download(doc.id,{id:user,admin:false,roles:['member']}),null);
  assert.deepEqual(await repo.get(other),{entities:[],version:0});
  await assert.rejects(()=>repo.save(user,[],0,admin),/changed/);
  await assert.rejects(()=>repo.save(user,[{kind:'fund',id:'future-fund'}],saved.version,admin));
  await assert.rejects(()=>repo.save(user,[{kind:'property',id:randomUUID()}],saved.version,admin),/no longer available/);
  await repo.save(user,[],saved.version,admin);assert.equal((await repo.get(user)).entities.length,0);
  await assert.rejects(()=>repo.save(user,entities,saved.version,admin),/changed/);
  assert.equal((await pg.query<{relrowsecurity:boolean}>("SELECT relrowsecurity FROM pg_class WHERE oid='member_investments'::regclass")).rows[0].relrowsecurity,true);
 }finally{await pg.close();}
});
