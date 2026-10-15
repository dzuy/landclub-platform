import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {embeddedDatabase} from '../src/lib/database';
import {deleteMemberAccount} from '../src/lib/delete-member';

test('account deletion requires admin and confirmation before any side effects',async()=>{
 const db={query:async()=>{throw new Error('Unexpected database access');},transaction:async()=>{throw new Error('Unexpected database access');}};
 const remove=async()=>{throw new Error('Unexpected provider access');};
 await assert.rejects(deleteMemberAccount(db,{admin:false},randomUUID(),'DELETE',remove),/Admin/);
 await assert.rejects(deleteMemberAccount(db,{admin:true},randomUUID(),'wrong',remove),/confirm/);
 await assert.rejects(deleteMemberAccount(db,{admin:true},'invalid','DELETE',remove));
});

test('deletion rolls back on auth failure, removes only target data, and permits retry',async()=>{
 const pg=new PGlite();
 try{
  for(const file of ['001_property_content.sql','003_invitations_and_roles.sql','008_prepared_members.sql','006_member_properties.sql','012_member_documents.sql'])await pg.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));
  const db=embeddedDatabase(pg),user=randomUUID(),other=randomUUID(),draft=randomUUID(),invite=randomUUID(),property=randomUUID();
  await db.query('INSERT INTO properties(id,draft) VALUES($1,$2)',[property,JSON.stringify({slug:'test'})]);
  await db.query("INSERT INTO invitations(id,email,roles,status,auth_user_id,invited_by) VALUES($1,'member@example.com',ARRAY['admin'],'accepted',$2,'admin')",[invite,user]);
  await db.query("INSERT INTO prepared_members(id,email,info,roles,status,created_by,auth_user_id,invitation_id) VALUES($1,'member@example.com','{}',ARRAY['admin'],'invited','admin',$2,$3)",[draft,user,invite]);
  for(const id of [user,other]){
   await db.query("INSERT INTO user_roles(user_id,role,granted_by) VALUES($1,'admin','admin')",[id]);
   await db.query("INSERT INTO member_properties(user_id,property_id,role,updated_by) VALUES($1,$2,'owner','admin')",[id,property]);
  }
  for(const id of [user,draft,other])await db.query("INSERT INTO member_documents(id,member_id,filename,byte_size,content,uploaded_by) VALUES($1,$2,'test.txt',1,'x','admin')",[randomUUID(),id]);
  await assert.rejects(deleteMemberAccount(db,{admin:true},user,'DELETE',async()=>{throw new Error('Provider unavailable');}),/Provider/);
  assert.equal((await db.query('SELECT * FROM user_roles')).rows.length,2);
  assert.equal((await db.query('SELECT * FROM member_documents')).rows.length,3);
  let calls=0;
  await deleteMemberAccount(db,{admin:true},user,'DELETE',async()=>{calls++;});
  assert.equal(calls,1);
  for(const table of ['user_roles','member_properties'])assert.deepEqual((await db.query<{user_id:string}>(`SELECT user_id FROM ${table}`)).rows.map(r=>r.user_id),[other]);
  assert.deepEqual((await db.query<{member_id:string}>('SELECT member_id FROM member_documents')).rows.map(r=>r.member_id),[other]);
  for(const table of ['invitations','prepared_members'])assert.equal((await db.query(`SELECT * FROM ${table}`)).rows.length,0);
  assert.equal((await db.query('SELECT * FROM properties')).rows.length,1);
  await deleteMemberAccount(db,{admin:true},user,'DELETE',async()=>{});
 }finally{await pg.close();}
});

test('drafts and pending invitations can be deleted before acceptance',async()=>{
 const {deleteUnacceptedMember}=await import('../src/lib/delete-member');
 const pg=new PGlite();
 try{
  for(const file of ['001_property_content.sql','003_invitations_and_roles.sql','008_prepared_members.sql','006_member_properties.sql','012_member_documents.sql'])await pg.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));
  const db=embeddedDatabase(pg),draft=randomUUID(),invite=randomUUID(),user=randomUUID();
  await db.query("INSERT INTO prepared_members(id,email,info,roles,status,created_by) VALUES($1,'draft@example.com','{}',ARRAY['member'],'draft','admin')",[draft]);
  await db.query("INSERT INTO member_documents(id,member_id,filename,byte_size,content,uploaded_by) VALUES($1,$2,'test.txt',1,'x','admin')",[randomUUID(),draft]);
  const unexpected=async()=>{throw new Error('Unexpected auth call');};
  await assert.rejects(deleteUnacceptedMember(db,{admin:false},'prepared',draft,'DELETE',unexpected),/Admin/);
  await assert.rejects(deleteUnacceptedMember(db,{admin:true},'prepared',draft,'no',unexpected),/confirm/);
  await db.query("UPDATE prepared_members SET status='sending' WHERE id=$1",[draft]);
  await assert.rejects(deleteUnacceptedMember(db,{admin:true},'prepared',draft,'DELETE',unexpected),/Check invitation status/);
  await db.query("UPDATE prepared_members SET status='draft' WHERE id=$1",[draft]);
  await deleteUnacceptedMember(db,{admin:true},'prepared',draft,'DELETE',unexpected);
  assert.equal((await db.query('SELECT * FROM member_documents')).rows.length,0);
  assert.equal((await db.query('SELECT * FROM prepared_members')).rows.length,0);
  await db.query("INSERT INTO invitations(id,email,roles,status,auth_user_id,invited_by) VALUES($1,'pending@example.com',ARRAY['member'],'pending',$2,'admin')",[invite,user]);
  await assert.rejects(deleteUnacceptedMember(db,{admin:true},'invitation',invite,'DELETE',async()=>{throw new Error('Provider failed');}),/Provider/);
  assert.equal((await db.query('SELECT * FROM invitations')).rows.length,1);
  let removed='';
  await deleteUnacceptedMember(db,{admin:true},'invitation',invite,'DELETE',async id=>{removed=id;});
  assert.equal(removed,user);
  assert.equal((await db.query('SELECT * FROM invitations')).rows.length,0);
 }finally{await pg.close();}
});
