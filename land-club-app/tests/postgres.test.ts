import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {migrate} from '../scripts/migrate.mjs';
import {seedDemo} from '../scripts/seed-demo.mjs';
test('production migrations and seeding are repeatable and preserve edited content',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();
 try{
  await migrate(db);await migrate(db);await seedDemo(db);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM properties')).rows[0].n,5);
  await db.query("UPDATE properties SET draft=jsonb_set(draft,'{name}','\"Staff edited title\"'),published=NULL WHERE draft->>'slug'='norden-cross'");
  await seedDemo(db);
  const record=(await db.query("SELECT draft,published FROM properties WHERE draft->>'slug'='norden-cross'")).rows[0];
  assert.equal(record.draft.name,'Staff edited title');assert.equal(record.published,null);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM schema_migrations')).rows[0].n,2);
  const rls=await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='land_club.properties'::regclass");assert.equal(rls.rows[0].relrowsecurity,true);
 }finally{await db.end();}
});
