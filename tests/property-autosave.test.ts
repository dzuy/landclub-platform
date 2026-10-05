import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {PropertyAutosave,type SaveDraft} from '../src/lib/property-autosave';
import {readDraft,type PropertyRecord} from '../src/lib/schema';
import seeds from '../src/lib/seed-properties.json';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {PropertyRepository} from '../src/lib/repository';
function initial():PropertyRecord{return {id:'00000000-0000-4000-8000-000000000001',draft:readDraft(seeds[0]),published:readDraft(seeds[0]),version:1,published_at:'2026-01-01',updated_at:'2026-01-01'};}
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}
test('typing is debounced and reverting before save makes no request',async()=>{
 const base=initial();let calls=0;const saver=new PropertyAutosave(base,async(_id,version,draft)=>{calls++;return {ok:true,record:{...base,version:version+1,draft}};},15);
 try{
 saver.edit(d=>({...d,name:'First'}));saver.edit(d=>({...d,name:'Final'}));await delay(50);
 assert.equal(calls,1);assert.equal(saver.getSnapshot().record.draft.name,'Final');assert.equal(saver.dirty,false);
 saver.edit(d=>({...d,name:'temporary'}));saver.edit(d=>({...d,name:'Final'}));await delay(30);assert.equal(calls,1);
 }finally{saver.stop();}
});
test('edits during a slow save survive; requests serialize with latest version',async()=>{
 const base=initial(),first=deferred<Awaited<ReturnType<SaveDraft>>>();const requests:{version:number;name:string}[]=[];
 const saver=new PropertyAutosave(base,async(_id,version,draft)=>{requests.push({version,name:draft.name});if(requests.length===1)return first.promise;return {ok:true,record:{...base,version:version+1,draft}};},10000);
 try{
 saver.edit(d=>({...d,name:'First'}));const saving=saver.flush();await delay(0);
 saver.edit(d=>({...d,name:'Latest'}));const closing=saver.flush();assert.equal(requests.length,1);
 first.resolve({ok:true,record:{...base,version:2,draft:{...base.draft,name:'First'}}});
 assert.equal(await saving,true);assert.equal(await closing,true);
 assert.deepEqual(requests,[{version:1,name:'First'},{version:2,name:'Latest'}]);assert.equal(saver.getSnapshot().draft.name,'Latest');assert.equal(saver.dirty,false);
 }finally{saver.stop();}
});
test('failed saves retain edits, stop until retry and keep optimistic concurrency version',async()=>{
 const base=initial();let fail=true,calls=0;const versions:number[]=[];
 const saver=new PropertyAutosave(base,async(_id,version,draft)=>{calls++;versions.push(version);if(fail)return {ok:false,error:'This property changed in another window.'};return {ok:true,record:{...base,version:version+1,draft}};},15);
 try{
 saver.edit(d=>({...d,name:'Keep my edit'}));assert.equal(await saver.flush(),false);await delay(35);
 assert.equal(calls,1);assert.equal(saver.getSnapshot().draft.name,'Keep my edit');assert.equal(saver.dirty,true);assert.match(saver.getSnapshot().error,/another window/);
 fail=false;assert.equal(await saver.flush(),true);assert.deepEqual(versions,[1,1]);assert.equal(saver.getSnapshot().error,'');
 }finally{saver.stop();}
});
test('transport failures and synchronous exceptions can be retried',async()=>{
 const base=initial();let fail=true;const saver=new PropertyAutosave(base,(_id,version,draft)=>{if(fail)throw new Error('network');return Promise.resolve({ok:true,record:{...base,version:version+1,draft}});},10000);
 try{saver.edit(d=>({...d,name:'Retained'}));assert.equal(await saver.flush(),false);assert.equal(saver.getSnapshot().saving,false);fail=false;assert.equal(await saver.flush(),true);assert.equal(saver.getSnapshot().record.draft.name,'Retained');}finally{saver.stop();}
});
test('failure cancels a pending debounce from edits made during the request',async()=>{
 const base=initial(),first=deferred<Awaited<ReturnType<SaveDraft>>>();let calls=0;
 const saver=new PropertyAutosave(base,async()=>{calls++;return first.promise;},20);
 try{
  saver.edit(d=>({...d,name:'First'}));const saving=saver.flush();await delay(0);
  saver.edit(d=>({...d,name:'Latest'}));first.resolve({ok:false,error:'Connection unavailable'});
  assert.equal(await saving,false);await delay(50);
  assert.equal(calls,1);assert.equal(saver.getSnapshot().draft.name,'Latest');assert.equal(saver.dirty,true);
 }finally{saver.stop();}
});
test('uploads pause saves, and resuming saves all photo edits',async()=>{
 const base=initial();let calls=0;const saver=new PropertyAutosave(base,async(_id,version,draft)=>{calls++;return {ok:true,record:{...base,version:version+1,draft}};},10);
 try{
 saver.setPaused(true);saver.edit(d=>({...d,imageAlt:'New uploaded image'}));await delay(30);assert.equal(calls,0);assert.equal(await saver.flush(),false);
 saver.setPaused(false);await delay(35);assert.equal(calls,1);assert.equal(saver.dirty,false);
 }finally{saver.stop();}
});
test('autosave persists draft fields without publishing; stale versions cannot overwrite newer edits',async()=>{
 const pg=new PGlite(),db=embeddedDatabase(pg),repo=new PropertyRepository(db);await repo.initialize();let record=await repo.create(seeds[0],'test');record=await repo.publish(record.id,record.version,'test');
 const saver=new PropertyAutosave(record,async(id,version,draft)=>{try{return {ok:true,record:await repo.save(id,version,draft,'autosave-test')};}catch{return {ok:false,error:'Version conflict'};}},10000);
 try{
 saver.edit(d=>({...d,summary:'Automatically saved draft'}));assert.equal(await saver.flush(),true);
 const saved=(await repo.get(record.id))!;assert.equal(saved.draft.summary,'Automatically saved draft');assert.deepEqual(saved.published,record.published);
 await repo.save(saved.id,saved.version,{...saved.draft,summary:'Another editor'},'other');
 saver.edit(d=>({...d,summary:'My unsaved edit'}));assert.equal(await saver.flush(),false);
 assert.equal((await repo.get(saved.id))!.draft.summary,'Another editor');assert.equal(saver.getSnapshot().draft.summary,'My unsaved edit');
 }finally{saver.stop();await pg.close();}
});
