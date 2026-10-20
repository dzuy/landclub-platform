import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {MemberDocumentRepository} from '../src/lib/member-documents';
import {GroupDocumentRepository} from '../src/lib/group-documents';
import {securitySchema} from './document-security-fixtures';

test('document deletion requires admin, rejects stale versions, removes downloads and preserves audited bytes',async()=>{
 const pg=new PGlite();try{
  await pg.exec('CREATE TABLE properties(id uuid PRIMARY KEY,draft jsonb); CREATE TABLE prepared_members(id uuid PRIMARY KEY,auth_user_id uuid,status text); CREATE TABLE member_properties(user_id uuid,property_id uuid)');
  await securitySchema(pg);const db=embeddedDatabase(pg);
  const admin={id:'test-admin',admin:true,roles:[]},member={id:randomUUID(),admin:false,roles:[]};
  const personal=new MemberDocumentRepository(db),groups=new GroupDocumentRepository(db),bytes=Buffer.from('Synthetic deletion test');
  const privateDoc=await personal.upload(member.id,'private.txt',bytes,[],admin);
  const sharedDoc=await groups.upload('shared.txt',bytes,[],{everyone:true,propertyIds:[],roles:[]},admin);
  for(const [repo,doc,table] of [[personal,privateDoc,'member_documents'],[groups,sharedDoc,'group_documents']] as const){
   await assert.rejects(repo.remove(doc.id,doc.version,member),/Admin/);
   await assert.rejects(repo.remove(doc.id,doc.version+1,admin),/changed/);
   assert.ok(await repo.download(doc.id,member));
   await repo.remove(doc.id,doc.version,admin);
   assert.equal(await repo.download(doc.id,member),null);
   assert.equal(await repo.download(doc.id,admin),null);
   await assert.rejects(repo.remove(doc.id,doc.version,admin),/changed/);
   await assert.rejects(repo.updateMetadata(doc.id,doc.version+1,{displayName:'revive',notes:'',tags:[]},admin),/changed/);
   const saved=(await db.query<{content:string;deleted_at:unknown}>(`SELECT content,deleted_at FROM ${table} WHERE id=$1`,[doc.id])).rows[0];
   assert.ok(saved.deleted_at);assert.equal(saved.content,bytes.toString('base64'));
   assert.equal((await db.query("SELECT id FROM document_audit_events WHERE resource_id=$1 AND event='delete' AND actor='test-admin'",[doc.id])).rows.length,1);
  }
  assert.equal((await personal.list(member.id,member)).length,0);
  assert.equal((await groups.listForMember(member)).length,0);
  assert.equal((await groups.listAdmin(admin)).length,0);
 }finally{await pg.close();}
});
