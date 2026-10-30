import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {PropertyCardPreferences,CardOrderConflict} from '../src/lib/property-card-preferences';

const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
test('database order is per user, persists between repository instances and rejects stale devices',async()=>{
 const db=new PGlite();
 try{
  await db.exec(await readFile(new URL('../migrations/028_property_card_order.sql',import.meta.url),'utf8'));
  const first=new PropertyCardPreferences(embeddedDatabase(db)),second=new PropertyCardPreferences(embeddedDatabase(db));
  assert.deepEqual(await first.read('alice'),{order:[],version:0});
  assert.deepEqual(await first.save('alice',{order:[b,a],version:0},[a,b]),{order:[b,a],version:1});
  assert.deepEqual(await second.read('alice'),{order:[b,a],version:1});
  assert.deepEqual(await second.read('bob'),{order:[],version:0});
  await assert.rejects(second.save('alice',{order:[a,b],version:0},[a,b]),CardOrderConflict);
  await second.save('alice',{order:[a,b],version:1},[a,b]);
  await assert.rejects(first.save('alice',{order:[b,a],version:1},[a,b]),CardOrderConflict);
  await assert.rejects(first.save('bob',{order:[a],version:0},[b]),/access changed/);
  await assert.rejects(first.save('bob',{order:[b,b],version:0},[b]));
  await assert.rejects(first.save('bob',{order:[b],version:0,userId:'alice'},[b]));
  await first.save('bob',{order:[],version:0},[]);
  assert.deepEqual(await first.read('alice'),{order:[a,b],version:2});
 }finally{await db.close();}
});
