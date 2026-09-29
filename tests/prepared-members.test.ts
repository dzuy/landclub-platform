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
