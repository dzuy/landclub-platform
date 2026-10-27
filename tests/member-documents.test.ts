import {securitySchema} from './document-security-fixtures';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {PreparedMemberRepository} from '../src/lib/prepared-members';
import {MemberDocumentRepository,MAX_DOCUMENT_BYTES,validateDocument,documentTagsSchema} from '../src/lib/member-documents';

test('private documents persist, isolate members and allow only admins to upload or retag',async()=>{
 const db=new PGlite(),adapter=embeddedDatabase(db);const admin={id:'test-admin',admin:true},alice={id:randomUUID(),admin:false},bob={id:randomUUID(),admin:false};
 try{
  await new PreparedMemberRepository(adapter).initialize();await securitySchema(db);
  const repo=new MemberDocumentRepository(adapter),bytes=Buffer.from('Synthetic private document for tests only');
  const doc=await repo.upload(alice.id,'statement.txt',bytes,['Property: Test Farm','Role: Investor','Tax 2026'],admin,{displayName:'Quarterly report',notes:'Synthetic upload notes'});
  assert.equal(doc.display_name,'Quarterly report');assert.equal(doc.notes,'Synthetic upload notes');assert.equal('content' in doc,false);assert.ok(await repo.download(doc.id,admin));

  const reloaded=new MemberDocumentRepository(adapter);
  assert.equal((await reloaded.list(alice.id,alice))[0].display_name,'Quarterly report');assert.equal((await reloaded.list(alice.id,alice))[0].notes,'Synthetic upload notes');assert.equal((await reloaded.list(alice.id,alice)).length,1);
  assert.equal((await reloaded.list(bob.id,bob)).length,0);
  await assert.rejects(reloaded.list(alice.id,bob),/Access denied/);
  assert.equal(await reloaded.download(doc.id,bob),null);
  assert.equal(await reloaded.download(doc.id,{id:'anonymous',admin:false}),null);
  const own=await reloaded.download(doc.id,alice);assert.ok(own);assert.deepEqual(Buffer.from(own.content,'base64'),bytes);
  assert.ok(await reloaded.download(doc.id,admin));
  await assert.rejects(repo.upload(bob.id,'statement.txt',bytes,[],alice),/Admin access/);
  await assert.rejects(repo.updateTags(doc.id,doc.version,['Other'],alice),/Admin access/);
  const updated=await repo.updateTags(doc.id,doc.version,['Role: Owner','role: owner','Tax'],admin);
  assert.deepEqual(updated.tags,['role: owner','Tax']);assert.equal(updated.member_id,alice.id);
  await assert.rejects(repo.updateTags(doc.id,doc.version,['Stale'],admin),/changed/);
  assert.equal(await reloaded.download(doc.id,bob),null);
  assert.equal((await reloaded.list(alice.id,admin))[0].version,2);
 }finally{await db.close();}
});

test('prepared documents follow the explicitly linked account and revoke access after cancellation',async()=>{
 const db=new PGlite(),adapter=embeddedDatabase(db);const prepared=new PreparedMemberRepository(adapter),admin={id:'test-admin',admin:true},id=randomUUID(),user={id:randomUUID(),admin:false},other={id:randomUUID(),admin:false};
 try{
  await prepared.initialize();await securitySchema(db);
  await prepared.create(id,{email:'synthetic@example.com',displayName:'Synthetic',homeRegion:'',contactPhone:''},['member'],admin.id);
  const repo=new MemberDocumentRepository(adapter),doc=await repo.upload(id,'terms.txt',Buffer.from('Synthetic terms'),[],admin);
  assert.equal(await repo.download(doc.id,user),null);
  await db.query("UPDATE prepared_members SET status='invited',auth_user_id=$2 WHERE id=$1",[id,user.id]);
  assert.equal((await repo.list(user.id,user)).length,1);assert.ok(await repo.download(doc.id,user));assert.equal(await repo.download(doc.id,other),null);
  await db.query("UPDATE prepared_members SET status='draft',auth_user_id=NULL WHERE id=$1",[id]);
  assert.equal((await repo.list(user.id,user)).length,0);assert.equal(await repo.download(doc.id,user),null);assert.ok(await repo.download(doc.id,admin));
 }finally{await db.close();}
});

test('document validation rejects oversized, empty, executable and disguised files',()=>{
 assert.equal(validateDocument('../report\r\n.txt',Buffer.from('Synthetic text')),'report.txt');
 assert.throws(()=>validateDocument('report.pdf',Buffer.alloc(0)));
 assert.throws(()=>validateDocument('report.txt',Buffer.alloc(MAX_DOCUMENT_BYTES+1)));
 assert.throws(()=>validateDocument('report.pdf',Buffer.from('<script>')));
 assert.throws(()=>validateDocument('report.html',Buffer.from('<html>')));
 assert.throws(()=>validateDocument('report.docx',Buffer.from('not a document')));
 assert.throws(()=>documentTagsSchema.parse(['x'.repeat(101)]));
 assert.throws(()=>documentTagsSchema.parse(Array.from({length:31},(_,i)=>String(i))));
});

test('document labels and notes preserve original bytes, ownership and optimistic versions',async()=>{
 const pg=new PGlite(),db=embeddedDatabase(pg),admin={id:'admin',admin:true},owner={id:randomUUID(),admin:false};
 try{
  await new PreparedMemberRepository(db).initialize();await securitySchema(pg);
  const repo=new MemberDocumentRepository(db),doc=await repo.upload(owner.id,'original.txt',Buffer.from('fixture'),[],admin);
  const metadata={displayName:'Friendly name',notes:'Optional context',tags:['Test']};
  await assert.rejects(repo.updateMetadata(doc.id,1,metadata,owner),/Admin/);
  const saved=await repo.updateMetadata(doc.id,1,metadata,admin);
  assert.equal(saved.display_name,'Friendly name');assert.equal(saved.notes,'Optional context');assert.equal(saved.filename,'original.txt');assert.equal(saved.version,2);assert.equal(saved.member_id,owner.id);
  assert.equal((await repo.download(doc.id,owner))?.content,Buffer.from('fixture').toString('base64'));
  await assert.rejects(repo.updateMetadata(doc.id,1,metadata,admin),/changed/);
  await assert.rejects(repo.updateMetadata(doc.id,2,{...metadata,notes:'x'.repeat(4001)},admin));
  assert.equal((await repo.updateMetadata(doc.id,2,{displayName:'',notes:'',tags:[]},admin)).display_name,'');
 }finally{await pg.close();}
});
