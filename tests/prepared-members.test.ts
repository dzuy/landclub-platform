import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {PreparedMemberRepository} from '../src/lib/prepared-members';
import {InvitationRepository} from '../src/lib/invitations';
import {MemberPropertyRepository} from '../src/lib/member-properties';

test('prepared members retain their profile and associations through invitation and acceptance',async()=>{
 const pg=new PGlite();try{
 const db=embeddedDatabase(pg);const drafts=new PreparedMemberRepository(db);const invitations=new InvitationRepository(db);const properties=new MemberPropertyRepository(db);
 await pg.exec('CREATE TABLE properties(id uuid PRIMARY KEY,draft jsonb NOT NULL)');
 await pg.exec(await readFile(new URL('../migrations/008_prepared_members.sql',import.meta.url),'utf8'));
 await invitations.initialize();await properties.initialize();
 const id=randomUUID(),user=randomUUID(),property=randomUUID(),invitation=randomUUID();
 await db.query('INSERT INTO properties VALUES($1,$2)',[property,JSON.stringify({name:'Prepared property',region:'California'})]);
 const info={displayName:'Alex Member',homeRegion:'Oregon',contactPhone:'555-0100'};
 await drafts.create(id,{email:'ALEX@example.com',...info},['member','investor'],'admin');
 await assert.rejects(drafts.create(randomUUID(),{email:'alex@example.com',...info},['member'],'admin'));
 await properties.save(id,property,['owner','investor'],{id:'admin',admin:true});
 await drafts.saveInfo(id,{...info,homeRegion:'California'});await drafts.saveRoles(id,['member','owner','investor']);
 const claimed=await drafts.beginDelivery(id);assert.equal(claimed.info.homeRegion,'California');
 await assert.rejects(drafts.beginDelivery(id));await assert.rejects(drafts.saveInfo(id,info));await assert.rejects(drafts.saveRoles(id,['admin']));
 assert.deepEqual(await invitations.rolesForUser(user),[]);
 await invitations.begin(invitation,claimed.email,claimed.roles,'admin');
 await assert.rejects(drafts.finishDelivery(id,user,randomUUID()));
 assert.equal((await properties.list(id)).length,1);assert.equal((await properties.list(user)).length,0);
 await drafts.finishDelivery(id,user,invitation);
 assert.equal((await drafts.list()).length,0);assert.equal((await properties.list(id)).length,0);
 assert.deepEqual((await properties.list(user))[0].roles,['owner','investor']);
 assert.equal(await invitations.pendingForUser(user,'wrong@example.com'),null);
 assert.equal((await invitations.pendingForUser(user,'alex@example.com'))?.id,invitation);
 await invitations.accept(invitation,user);assert.deepEqual(await invitations.rolesForUser(user),['member','owner','investor']);
 await assert.rejects(drafts.finishDelivery(id,user,invitation));
 assert.equal((await db.query<{relrowsecurity:boolean}>("SELECT relrowsecurity FROM pg_class WHERE oid='prepared_members'::regclass")).rows[0].relrowsecurity,true);
 }finally{await pg.close();}
});

test('rejected delivery preserves editable setup and permits a single retry',async()=>{
 const pg=new PGlite();try{const drafts=new PreparedMemberRepository(embeddedDatabase(pg));await drafts.initialize();const id=randomUUID();
 await drafts.create(id,{email:'retry@example.com',displayName:'Retry',homeRegion:'',contactPhone:''},['member'],'admin');
 await drafts.beginDelivery(id);await drafts.deliveryFailed(id);assert.equal((await drafts.get(id))?.status,'draft');
 await drafts.saveRoles(id,['owner']);assert.deepEqual((await drafts.beginDelivery(id)).roles,['owner']);await assert.rejects(drafts.beginDelivery(id));
 }finally{await pg.close();}
});

test('cancel, reuse and reinvite preserves setup and rebinds assignments to the new user',async()=>{
 const pg=new PGlite();try{
  const db=embeddedDatabase(pg),drafts=new PreparedMemberRepository(db),invitations=new InvitationRepository(db),properties=new MemberPropertyRepository(db);
  await pg.exec('CREATE TABLE properties(id uuid PRIMARY KEY,draft jsonb NOT NULL)');
  await drafts.initialize();await invitations.initialize();await properties.initialize();
  const id=randomUUID(),oldUser=randomUUID(),newUser=randomUUID(),property=randomUUID(),first=randomUUID(),second=randomUUID();
  const info={email:'retry@example.com',displayName:'Saved Name',homeRegion:'California',contactPhone:'123'};
  await drafts.create(id,info,['member'],'admin');
  await db.query('INSERT INTO properties VALUES($1,$2)',[property,JSON.stringify({name:'Test',region:'California'})]);
  await properties.save(id,property,['owner','investor'],{id:'admin',admin:true});
  await drafts.beginDelivery(id,first);await invitations.begin(first,info.email,['member'],'admin');await drafts.finishDelivery(id,oldUser,first);
  assert.equal(await drafts.createOrReuseDraft(randomUUID(),info,['admin'],'admin'),'unavailable');
  await invitations.updatePendingRoles(first,['member','owner']);
  assert.equal(await drafts.cancelInvitation(first,'admin'),true);
  await assert.rejects(drafts.cancelInvitation(first,'admin'));
  const restored=await drafts.get(id);assert.equal(restored?.status,'draft');assert.equal(restored?.auth_user_id,null);assert.equal(restored?.invitation_id,null);
  assert.deepEqual(restored?.roles,['member','owner']);assert.equal((await properties.list(oldUser)).length,0);
  assert.deepEqual((await properties.list(id))[0].roles,['owner','investor']);
  assert.equal(await drafts.createOrReuseDraft(randomUUID(),{...info,displayName:'Accidental replacement'},['admin'],'admin'),'existing');
  assert.equal((await drafts.get(id))?.info.displayName,'Saved Name');assert.deepEqual((await drafts.get(id))?.roles,['member','owner']);
  await drafts.beginDelivery(id,second);await invitations.begin(second,info.email,restored!.roles,'admin');await drafts.finishDelivery(id,newUser,second);
  assert.equal((await properties.list(id)).length,0);assert.equal((await properties.list(newUser)).length,1);
  await invitations.accept(second,newUser);await assert.rejects(drafts.cancelInvitation(second,'admin'));
  assert.equal((await drafts.get(id))?.status,'invited');assert.deepEqual(await invitations.rolesForUser(newUser),['member','owner']);
 }finally{await pg.close();}
});

test('repair migration restores only drafts stranded by explicit cancellation and is repeatable',async()=>{
 const pg=new PGlite();try{
  const db=embeddedDatabase(pg),drafts=new PreparedMemberRepository(db),invitations=new InvitationRepository(db),properties=new MemberPropertyRepository(db);
  await pg.exec('CREATE TABLE properties(id uuid PRIMARY KEY,draft jsonb NOT NULL)');
  await drafts.initialize();await invitations.initialize();await properties.initialize();
  const cases=['cancelled','pending','accepted','delivery-failed'] as const;
  const ids:Record<string,{id:string;user:string;invitation:string}>={};
  const property=randomUUID();await db.query('INSERT INTO properties VALUES($1,$2)',[property,JSON.stringify({name:'Test',region:'California'})]);
  for(const status of cases){
   const id=randomUUID(),user=randomUUID(),invitation=randomUUID();ids[status]={id,user,invitation};
   await drafts.create(id,{email:status+'@example.com',displayName:status,homeRegion:'',contactPhone:''},['member'],'admin');
   await properties.save(id,property,['owner'],{id:'admin',admin:true});
   await drafts.beginDelivery(id,invitation);await invitations.begin(invitation,status+'@example.com',['owner'],'admin');await drafts.finishDelivery(id,user,invitation);
   if(status==='cancelled')await invitations.cancel(invitation,'admin');
   if(status==='accepted')await invitations.accept(invitation,user);
   if(status==='delivery-failed')await invitations.markFailed(invitation,'Provider failure');
  }
  const repair=await readFile(new URL('../migrations/009_restore_cancelled_member_drafts.sql',import.meta.url),'utf8');
  await pg.exec(repair);await pg.exec(repair);
  assert.equal((await drafts.get(ids.cancelled.id))?.status,'draft');assert.deepEqual((await drafts.get(ids.cancelled.id))?.roles,['owner']);
  assert.equal((await properties.list(ids.cancelled.id)).length,1);assert.equal((await properties.list(ids.cancelled.user)).length,0);
  for(const status of cases.filter(value=>value!=='cancelled')){assert.equal((await drafts.get(ids[status].id))?.status,'invited');assert.equal((await properties.list(ids[status].user)).length,1);}
 }finally{await pg.close();}
});
