import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {EventRepository,eventSchema} from '../src/lib/events';
const input={title:'Members gathering',description:'A conversation with the club.',startsAt:'2026-11-01T18:00:00.000Z',endsAt:'2026-11-01T19:00:00.000Z',timeZone:'America/Costa_Rica',location:'Online',meetingUrl:'https://example.com/event',status:'scheduled' as const};
test('event lifecycle, member visibility, admin enforcement and conflicting saves',async()=>{
 const db=new PGlite();try{
 await db.exec(await readFile(new URL('../migrations/005_events.sql',import.meta.url),'utf8'));
 const repo=new EventRepository(embeddedDatabase(db)),admin={id:'admin',admin:true};
 await assert.rejects(()=>repo.save(input,{id:'member',admin:false}),/Only admins/);
 assert.equal((await repo.list()).length,0);
 const event=await repo.save(input,admin);
 assert.equal((await repo.list())[0].details.title,input.title);
 await assert.rejects(()=>repo.save({...input,title:'Unauthorized'}, {id:'member',admin:false},event.id,event.version),/Only admins/);
 const cancelled=await repo.save({...input,status:'cancelled'},admin,event.id,event.version);
 assert.equal((await repo.list())[0].details.status,'cancelled');
 await assert.rejects(()=>repo.save(input,admin,event.id,event.version),/changed in another window/);
 const archived=await repo.save({...input,status:'archived'},admin,event.id,cancelled.version);
 assert.equal((await repo.list()).length,0);assert.equal((await repo.list(true)).length,1);
 await repo.save(input,admin,event.id,archived.version);
 assert.equal((await repo.list()).length,1);
 const rls=await db.query<{relrowsecurity:boolean}>("SELECT relrowsecurity FROM pg_class WHERE oid='events'::regclass");assert.equal(rls.rows[0].relrowsecurity,true);
 }finally{await db.close();}
});
test('event validation rejects invalid schedules, links, time zones and empty content',()=>{
 for(const change of [{endsAt:input.startsAt},{meetingUrl:'javascript:alert(1)'},{timeZone:'not-a-zone'},{title:' '},{description:''}])assert.equal(eventSchema.safeParse({...input,...change}).success,false);
 assert.equal(eventSchema.safeParse(input).success,true);
});
