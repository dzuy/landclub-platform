import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {PropertyRepository,ConflictError} from '../src/lib/repository';
import seeds from '../src/lib/seed-properties.json';

test('property deletion checks version and removes dependent records without changing other properties or document audiences',async()=>{
 const pg=new PGlite();
 try{
  const db=embeddedDatabase(pg),repo=new PropertyRepository(db);await repo.initialize();
  for(const file of ['006_member_properties.sql','010_property_photos.sql','011_property_photo_objects.sql','013_group_documents.sql'])await pg.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));
  const target=await repo.create(seeds[0],'test'),other=await repo.create({...seeds[0],slug:'other'},'test');
  const photo=randomUUID();
  await db.query("INSERT INTO property_photos(id,property_id,mime,content) VALUES($1,$2,'image/jpeg','test')",[photo,target.id]);
  await db.query("INSERT INTO property_photo_sources(property_id,source_system,source_id,photo_id) VALUES($1,'test','test',$2)",[target.id,photo]);
  await db.query("INSERT INTO member_properties(user_id,property_id,role,updated_by) VALUES($1,$2,'owner','test')",[randomUUID(),target.id]);
  await db.query("INSERT INTO group_documents(id,filename,byte_size,content,property_ids,uploaded_by) VALUES($1,'private.txt',1,'x',$2,'test')",[randomUUID(),[target.id]]);
  await assert.rejects(repo.delete(target.id,target.version+1),ConflictError);
  assert.ok(await repo.get(target.id));
  await repo.delete(target.id,target.version);
  assert.equal(await repo.get(target.id),null);assert.ok(await repo.get(other.id));
  for(const table of ['property_photos','property_photo_sources','member_properties','property_revisions'])assert.equal((await db.query(`SELECT * FROM ${table} WHERE property_id=$1`,[target.id])).rows.length,0);
  assert.deepEqual((await db.query<{property_ids:string[]}>('SELECT property_ids FROM group_documents')).rows[0].property_ids,[target.id]);
 }finally{await pg.close();}
});
