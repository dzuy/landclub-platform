import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {MemberPropertyRepository,memberInfoSchema} from '../src/lib/member-properties';

test('property membership is admin-only, isolated per member, unique and versioned',async()=>{
 const db=new PGlite();try{
 await db.exec('CREATE TABLE properties(id uuid PRIMARY KEY,draft jsonb NOT NULL)');
 await db.exec(await readFile(new URL('../migrations/006_member_properties.sql',import.meta.url),'utf8'));
 const repo=new MemberPropertyRepository(embeddedDatabase(db));
 const user='792f4cf3-41a5-4e3b-8a5f-fd1143cbbdc6',other='792f4cf3-41a5-4e3b-8a5f-fd1143cbbdc7',property='792f4cf3-41a5-4e3b-8a5f-fd1143cbbdc8';
 await db.query('INSERT INTO properties VALUES($1,$2)',[property,JSON.stringify({name:'Test property',region:'Test region'})]);
 const admin={id:'admin',admin:true},member={id:user,admin:false};
 await assert.rejects(()=>repo.save(user,property,'owner',member),/Admin access/);
 await repo.save(user,property,'owner',admin);
 assert.equal((await repo.list(user))[0].role,'owner');assert.equal((await repo.list(other)).length,0);
 await assert.rejects(()=>repo.save(user,property,'guest',admin),/already associated/);
 await repo.save(user,property,'investor',admin,1);
 await assert.rejects(()=>repo.save(user,property,'guest',admin,1),/changed/);
 await assert.rejects(()=>repo.remove(user,property,2,member),/Admin access/);
 await assert.rejects(()=>repo.remove(user,property,1,admin),/changed/);
 await repo.remove(user,property,2,admin);assert.equal((await repo.list(user)).length,0);
 await assert.rejects(()=>repo.save(user,property,'admin' as never,admin));
 await assert.rejects(()=>repo.save(user,other,'owner',admin));
 assert.equal((await db.query<{relrowsecurity:boolean}>("SELECT relrowsecurity FROM pg_class WHERE oid='member_properties'::regclass")).rows[0].relrowsecurity,true);
 }finally{await db.close();}
});
test('member information excludes credentials, roles and identity fields',()=>{
 assert.deepEqual(memberInfoSchema.parse({displayName:' Alex ',homeRegion:' Oregon ',contactPhone:'',role:'admin',email:'other@example.com',password:'secret'}),{displayName:'Alex',homeRegion:'Oregon',contactPhone:''});
 assert.equal(memberInfoSchema.safeParse({displayName:' ',homeRegion:'',contactPhone:''}).success,false);
});
