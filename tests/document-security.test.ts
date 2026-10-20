import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import sharp from 'sharp';
import {PDFDocument,PDFName,PDFString} from 'pdf-lib';
import {embeddedDatabase} from '../src/lib/database';
import {MemberDocumentRepository,validateDocument} from '../src/lib/member-documents';
import {GroupDocumentRepository} from '../src/lib/group-documents';
import {PreparedMemberRepository} from '../src/lib/prepared-members';
import {validateDocumentContent} from '../src/lib/document-content';
import {securitySchema} from './document-security-fixtures';

test('authorized downloads and mutations are audited without contents; unavailable audit fails closed',async()=>{
 const pg=new PGlite();try{
  const db=embeddedDatabase(pg);await new PreparedMemberRepository(db).initialize();await securitySchema(pg);
  const repo=new MemberDocumentRepository(db),admin={id:randomUUID(),admin:true},owner={id:randomUUID(),admin:false},other={id:randomUUID(),admin:false};
  const content=Buffer.from('synthetic confidential content must not enter audit');
  const doc=await repo.upload(owner.id,'statement.txt',content,['private tag'],admin);
  assert.ok(await repo.download(doc.id,owner));assert.ok(await repo.download(doc.id,admin));assert.equal(await repo.download(doc.id,other),null);
  await repo.updateTags(doc.id,doc.version,['updated secret tag'],admin);
  const audit=await pg.query<{event:string;actor:string}>('SELECT * FROM document_audit_events');
  for(const event of ['upload','download_authorized','download_denied','metadata_changed'])assert.ok(audit.rows.some(row=>row.event===event),event);
  const json=JSON.stringify(audit.rows);for(const secret of ['confidential','private tag','updated secret tag','statement.txt',content.toString('base64')])assert.equal(json.includes(secret),false);
  await assert.rejects(pg.exec('DELETE FROM document_audit_events'),/append-only/);
  await assert.rejects(pg.exec('TRUNCATE document_audit_events'),/append-only/);
  const failingDb={...db,query:async<T>(sql:string,args?:unknown[])=>{if(sql.startsWith('INSERT INTO document_audit_events'))throw new Error('audit unavailable');return db.query<T>(sql,args);}};
  await assert.rejects(new MemberDocumentRepository(failingDb).download(doc.id,owner),/audit unavailable/);
  await pg.query('DELETE FROM member_documents WHERE id=$1',[doc.id]);
  assert.equal((await pg.query("SELECT event FROM document_audit_events WHERE event='delete'")).rows.length,1);
 }finally{await pg.close();}
});

test('audit migration preserves legacy bytes and audiences with immediate authorized download',async()=>{
 const pg=new PGlite();try{
  await pg.exec('CREATE TABLE properties(id uuid PRIMARY KEY,draft jsonb); CREATE TABLE member_properties(user_id uuid,property_id uuid)');
  for(const file of ['012_member_documents.sql','013_group_documents.sql'])await pg.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));
  const id=randomUUID();await pg.query("INSERT INTO group_documents(id,filename,byte_size,content,everyone,uploaded_by) VALUES($1,'old.docx',3,'b2xk',true,'admin')",[id]);
  const before=(await pg.query('SELECT * FROM group_documents')).rows;
  await securitySchema(pg);assert.deepEqual((await pg.query('SELECT * FROM group_documents')).rows,before.map(row=>({...row as object,display_name:'',notes:'',deleted_at:null})));
  const db=embeddedDatabase(pg),repo=new GroupDocumentRepository(db),admin={id:randomUUID(),admin:true,roles:['admin'] as const};
  assert.equal((await repo.download(id,{...admin,roles:['admin']}))?.content,'b2xk');
  await repo.update(id,1,[],{everyone:false,propertyIds:[],roles:['investor']},admin);
  assert.ok((await pg.query<{actor:string}>("SELECT actor FROM document_audit_events WHERE resource_id=$1 AND event='metadata_changed'",[id])).rows.some(row=>row.actor===admin.id));
  assert.deepEqual(await repo.listForMember({id:'anonymous',admin:false,roles:['member']}),[]);
  assert.equal(await repo.download(id,{id:randomUUID(),admin:false,roles:['member']}),null);
 }finally{await pg.close();}
});

test('content validation rejects malformed, encoded active and compressed active PDFs',async()=>{
 const valid=await PDFDocument.create();valid.addPage();const bytes=await valid.save();assert.equal(validateDocument('valid.pdf',bytes),'valid.pdf');await validateDocumentContent('valid.pdf',bytes);
 const fake=Buffer.from('%PDF-1.7\n1 0 obj\n<< >>\nendobj\nstartxref\n0\n%%EOF\n');await assert.rejects(validateDocumentContent('fake.pdf',fake));
 for(const name of ['JavaScript','URI','OpenAction','AcroForm','EmbeddedFiles']){
  const pdf=await PDFDocument.create();pdf.addPage();pdf.catalog.set(PDFName.of(name),PDFString.of('synthetic'));
  await assert.rejects(validateDocumentContent('active.pdf',await pdf.save({useObjectStreams:true})),/valid, unencrypted/);
 }
 const active=await PDFDocument.create();active.addPage();active.catalog.set(PDFName.of('JavaScript'),PDFString.of('synthetic'));
 const escaped=Buffer.from(await active.save({useObjectStreams:false})).toString('latin1').replace('/JavaScript','/#4aavaScript');
 await assert.rejects(validateDocumentContent('escaped.pdf',Buffer.from(escaped,'latin1')));
 for(const [name,data] of [['fake.png',Buffer.from('not image')],['binary.txt',Buffer.from([0,1])],['formula.csv',Buffer.from('name,amount\na,=1+1')],['office.docx',Buffer.from('PK\x03\x04')]] as const)assert.throws(()=>validateDocument(name,data));
 await assert.rejects(validateDocumentContent('broken.png',Buffer.from([137,80,78,71,13,10,26,10])));
 const png=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();await validateDocumentContent('image.png',png);
});
