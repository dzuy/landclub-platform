import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {randomUUID} from 'node:crypto';
import {readRoles} from '../src/lib/roles';

test('Team and Lender persist across invitation, account, draft and document constraints',async()=>{
 const db=new PGlite();
 try{
  for(const name of ['003_invitations_and_roles.sql','008_prepared_members.sql','013_group_documents.sql','015_team_and_lender_roles.sql'])await db.exec(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'));
  const roles=readRoles(['team','lender']);assert.deepEqual(roles,['member','team','lender']);
  const user=randomUUID();
  await db.query("INSERT INTO invitations(id,email,roles,status,invited_by) VALUES($1,'test@example.com',$2,'pending','test')",[randomUUID(),roles]);
  for(const role of roles)await db.query("INSERT INTO user_roles(user_id,role,granted_by) VALUES($1,$2,'test')",[user,role]);
  await db.query("INSERT INTO prepared_members(id,email,info,roles,created_by) VALUES($1,'draft@example.com','{}',$2,'test')",[randomUUID(),roles]);
  await db.query("INSERT INTO group_documents(id,filename,byte_size,content,roles,uploaded_by) VALUES($1,'test.txt',1,'x',$2,'test')",[randomUUID(),roles]);
  await assert.rejects(db.query("INSERT INTO user_roles(user_id,role,granted_by) VALUES($1,'invalid','test')",[randomUUID()]));
  await assert.rejects(db.query("UPDATE prepared_members SET roles='{}'"));
  await db.exec(await readFile(new URL('../migrations/015_team_and_lender_roles.sql',import.meta.url),'utf8'));
  assert.equal((await db.query('SELECT * FROM user_roles')).rows.length,3);
 }finally{await db.close();}
});
