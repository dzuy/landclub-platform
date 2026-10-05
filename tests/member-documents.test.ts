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
  await new PreparedMemberRepository(adapter).initialize();await db.exec(await readFile(new URL('../migrations/012_member_documents.sql',import.meta.url),'utf8'));
  const repo=new MemberDocumentRepository(adapter),bytes=Buffer.from('%PDF-1.7\nSynthetic private document for tests only');
  const doc=await repo.upload(alice.id,'statement.pdf',bytes,['Property: Test Farm','Role: Investor','Tax 2026'],admin);
  assert.equal('content' in doc,false);
  const reloaded=new MemberDocumentRepository(adapter);
  assert.equal((await reloaded.list(alice.id,alice)).length,1);
  assert.equal((await reloaded.list(bob.id,bob)).length,0);
  await assert.rejects(reloaded.list(alice.id,bob),/Access denied/);
  assert.equal(await reloaded.download(doc.id,bob),null);
  assert.equal(await reloaded.download(doc.id,{id:'anonymous',admin:false}),null);
  const own=await reloaded.download(doc.id,alice);assert.ok(own);assert.deepEqual(Buffer.from(own.content,'base64'),bytes);
  assert.ok(await reloaded.download(doc.id,admin));
  await assert.rejects(repo.upload(bob.id,'statement.pdf',bytes,[],alice),/Admin access/);
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
  await prepared.initialize();await db.exec(await readFile(new URL('../migrations/012_member_documents.sql',import.meta.url),'utf8'));
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
 assert.equal(validateDocument('../report\r\n.pdf',Buffer.from('%PDF-1.7')),'report.pdf');
 assert.throws(()=>validateDocument('report.pdf',Buffer.alloc(0)));
 assert.throws(()=>validateDocument('report.txt',Buffer.alloc(MAX_DOCUMENT_BYTES+1)));
 assert.throws(()=>validateDocument('report.pdf',Buffer.from('<script>')));
 assert.throws(()=>validateDocument('report.html',Buffer.from('<html>')));
 assert.throws(()=>validateDocument('report.docx',Buffer.from('not a document')));
 assert.throws(()=>documentTagsSchema.parse(['x'.repeat(101)]));
 assert.throws(()=>documentTagsSchema.parse(Array.from({length:31},(_,i)=>String(i))));
});
