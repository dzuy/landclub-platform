import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import sharp from 'sharp';
import {embeddedDatabase} from '../src/lib/database';
import {MemberDocumentRepository,validateDocument} from '../src/lib/member-documents';
import {GroupDocumentRepository} from '../src/lib/group-documents';
import {PreparedMemberRepository} from '../src/lib/prepared-members';
import {scanQuarantinedDocument,scanWithClamAV} from '../src/lib/document-scanner';
import {validateDocumentContent} from '../src/lib/document-content';
import {securitySchema} from './document-security-fixtures';

test('quarantine is fail closed for everyone, scanner errors and changed bytes; audit is durable and redacted',async()=>{
 const pg=new PGlite();try{
  const db=embeddedDatabase(pg);await new PreparedMemberRepository(db).initialize();await securitySchema(pg);
  const repo=new MemberDocumentRepository(db),admin={id:randomUUID(),admin:true},owner={id:randomUUID(),admin:false};
  const content=Buffer.from('synthetic confidential content must not enter audit');
  const doc=await repo.upload(owner.id,'statement.txt',content,['private tag'],admin);
  assert.equal(doc.scan_status,'quarantined');assert.equal(await repo.download(doc.id,owner),null);assert.equal(await repo.download(doc.id,admin),null);
  assert.deepEqual(await repo.list(owner.id,owner),[]);assert.equal((await repo.list(owner.id,admin)).length,1);
  assert.equal(await scanQuarantinedDocument(db,'member_documents',doc.id,async()=>{throw new Error('offline');}),'unavailable');
  assert.equal(await repo.download(doc.id,admin),null);
  assert.equal(await scanQuarantinedDocument(db,'member_documents',doc.id,async()=> 'clean'),'clean');
  assert.ok(await repo.download(doc.id,owner));
  await pg.query("UPDATE member_documents SET content=$2 WHERE id=$1",[doc.id,Buffer.from('tampered').toString('base64')]);assert.equal(await repo.download(doc.id,owner),null);
  const blocked=await repo.upload(owner.id,'bad.txt',Buffer.from('synthetic scanner rejection'),[],admin);
  await scanQuarantinedDocument(db,'member_documents',blocked.id,async()=> 'blocked');assert.equal(await repo.download(blocked.id,admin),null);
  const race=await repo.upload(owner.id,'race.txt',Buffer.from('race fixture'),[],admin);
  await scanQuarantinedDocument(db,'member_documents',race.id,async()=>{await pg.query('UPDATE member_documents SET content=$2 WHERE id=$1',[race.id,Buffer.from('changed during scan').toString('base64')]);return 'clean';});
  assert.equal(await repo.download(race.id,admin),null);
  await repo.updateTags(doc.id,doc.version,['updated secret tag'],admin);
  await pg.query('DELETE FROM member_documents WHERE id=$1',[blocked.id]);
  const audit=await pg.query<{event:string;actor:string}>('SELECT * FROM document_audit_events');
  for(const event of ['upload_quarantined','download_authorized','download_denied','metadata_or_scan_changed','delete'])assert.ok(audit.rows.some(row=>row.event===event),event);
  const json=JSON.stringify(audit.rows);for(const secret of ['confidential','private tag','updated secret tag','statement.txt',content.toString('base64')])assert.equal(json.includes(secret),false);
  await assert.rejects(pg.exec('DELETE FROM document_audit_events'),/append-only/);
  await assert.rejects(pg.exec('TRUNCATE document_audit_events'),/append-only/);
  // Missing audit storage must not silently release a document.
  const fresh=await repo.upload(owner.id,'fresh.txt',Buffer.from('fresh'),[],admin);await scanQuarantinedDocument(db,'member_documents',fresh.id,async()=> 'clean');
  const failingDb={...db,query:async<T>(sql:string,args?:unknown[])=>{if(sql.startsWith('INSERT INTO document_audit_events'))throw new Error('audit unavailable');return db.query<T>(sql,args);}};
  await assert.rejects(new MemberDocumentRepository(failingDb).download(fresh.id,owner),/audit unavailable/);
 }finally{await pg.close();}
});

test('existing files migrate to quarantine and group access changes are audited',async()=>{
 const pg=new PGlite();try{
  await pg.exec('CREATE TABLE properties(id uuid PRIMARY KEY,draft jsonb)');
  for(const file of ['012_member_documents.sql','013_group_documents.sql'])await pg.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));
  const id=randomUUID();await pg.query("INSERT INTO group_documents(id,filename,byte_size,content,everyone,uploaded_by) VALUES($1,'old.txt',3,'b2xk',true,'admin')",[id]);
  await securitySchema(pg);const db=embeddedDatabase(pg),repo=new GroupDocumentRepository(db),admin={id:randomUUID(),admin:true,roles:['admin'] as const};
  assert.equal((await pg.query<{scan_status:string}>('SELECT scan_status FROM group_documents')).rows[0].scan_status,'quarantined');
  assert.equal(await repo.download(id,{...admin,roles:['admin']}),null);
  await repo.update(id,1,[],{everyone:false,propertyIds:[],roles:['investor']},admin);
  assert.ok((await pg.query<{actor:string}>("SELECT actor FROM document_audit_events WHERE resource_id=$1 AND event='metadata_or_scan_changed'",[id])).rows.some(row=>row.actor===admin.id));
  assert.deepEqual(await repo.listForMember({id:'anonymous',admin:false,roles:['member']}),[]);
 }finally{await pg.close();}
});

test('content validation rejects disguised, active, truncated and formula files; images fully decode',async()=>{
 for(const [name,bytes] of [ ['fake.png',Buffer.from('not image')],['fake.jpg',Buffer.from('not image')],['fake.txt',Buffer.from([0xff,0xfe])],['binary.txt',Buffer.from([0,1])],['formula.csv',Buffer.from('name,amount\na,=1+1')],['office.docx',Buffer.from('PK\x03\x04')],['short.pdf',Buffer.from('%PDF-1.7\n')]] as const)assert.throws(()=>validateDocument(name,bytes));
 const pdf=Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog /JavaScript (bad) >>\nendobj\nstartxref\n0\n%%EOF');assert.throws(()=>validateDocument('active.pdf',pdf));
 await assert.rejects(validateDocumentContent('broken.png',Buffer.from([137,80,78,71,13,10,26,10])));
 const png=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();assert.equal(validateDocument('image.png',png),'image.png');await validateDocumentContent('image.png',png);
 assert.equal(await scanWithClamAV(Buffer.from('synthetic'),''),'unavailable');
 assert.equal(await scanWithClamAV(Buffer.from('synthetic'),'/nonexistent/clamav'),'unavailable');
});
