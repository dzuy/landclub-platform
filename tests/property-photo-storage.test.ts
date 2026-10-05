import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readdir,mkdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {PropertyRepository} from '../src/lib/repository';
import {initializePhotoStorage,photoMigration,photoMime,inspectPhoto,savePhoto,readPhoto,migrateLegacyPhotos,mayReadPhoto,type StoredPhoto} from '../src/lib/property-photo-storage';
import {checksum,localPhotoStorage,photoStorage,supabasePhotoStorage,type PhotoObjectStorage} from '../src/lib/photo-object-storage';
import {importPropertyPhotos,readImportPhoto} from '../src/lib/import-property-photos';
import {assetUrl} from '../src/lib/property-facts';
import type {SupabaseClient} from '@supabase/supabase-js';
import seeds from '../src/lib/seed-properties.json';
import {MAX_PHOTO_BYTES,PHOTO_MIME_TYPES,photoBucketIssues} from '../src/lib/photo-policy';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
async function fixture(){
 const root=await mkdtemp(path.join(os.tmpdir(),'land-photos-')),pg=new PGlite(),db=embeddedDatabase(pg),repo=new PropertyRepository(db);
 await repo.initialize();await initializePhotoStorage(db);const p=await repo.create(seeds[0],'test');
 const storage=localPhotoStorage(path.join(root,'objects'));
 return {root,db,repo,p,storage,close:async()=>{await pg.close();await rm(root,{recursive:true,force:true});}};
}
test('photo bytes live outside DB; metadata, dedup, provenance and integrity are preserved',async()=>{
 const f=await fixture();try{
 const first=await savePhoto(f.db,f.p.id,png,{storage:f.storage,originalFilename:'first.png',source:{system:'drive',id:'drive-a'}});
 const again=await savePhoto(f.db,f.p.id,png,{storage:f.storage,source:{system:'drive',id:'drive-b'}});assert.equal(first.id,again.id);
 assert.equal(assetUrl.safeParse(first.url).success,true);
 const saved=(await f.db.query<StoredPhoto>('SELECT * FROM property_photos')).rows[0];
 assert.equal(saved.content,null);assert.equal(saved.checksum,checksum(png));assert.equal(Number(saved.byte_size),png.length);assert.equal(saved.storage_backend,'local');
 assert.deepEqual(Buffer.from(await readPhoto(saved,f.storage)),png);
 assert.equal((await f.db.query('SELECT * FROM property_photo_sources')).rows.length,2);
 await writeFile(path.join(f.root,'objects',saved.storage_key!),Buffer.from('corrupt'));
 await assert.rejects(readPhoto(saved,f.storage),/integrity/);
 assert.equal(photoMime(Buffer.from('<svg onload="alert(1)"></svg>')),null);
 await assert.rejects(savePhoto(f.db,f.p.id,Buffer.from('not an image'),{storage:f.storage}));
 assert.equal(assetUrl.safeParse('/api/property-photos/../../secrets').success,false);
 await assert.rejects(f.storage.get('../../secret'),/Invalid/);
 }finally{await f.close();}
});
test('legacy migration is additive, verifies copies, preserves IDs/base64 and resumes',async()=>{
 const f=await fixture();try{
 const id=randomUUID();await f.db.query('INSERT INTO property_photos(id,property_id,mime,content) VALUES($1,$2,$3,$4)',[id,f.p.id,'image/png',png.toString('base64')]);
 const legacy=(await f.db.query<StoredPhoto>('SELECT * FROM property_photos')).rows[0];assert.deepEqual(Buffer.from(await readPhoto(legacy)),png);
 assert.equal((await migrateLegacyPhotos(f.db,f.storage)).photos,1);
 await assert.rejects(readdir(path.join(f.root,'objects')));
 const broken:PhotoObjectStorage={backend:'local',put:async()=>{},get:async()=>Buffer.from('wrong')};
 await assert.rejects(migrateLegacyPhotos(f.db,broken,true),/verification/);
 assert.equal((await f.db.query<StoredPhoto>('SELECT * FROM property_photos')).rows[0].storage_key,null);
 await migrateLegacyPhotos(f.db,f.storage,true);
 const migrated=(await f.db.query<StoredPhoto>('SELECT * FROM property_photos')).rows[0];
 assert.equal(migrated.id,id);assert.equal(migrated.content,png.toString('base64'));assert.deepEqual(Buffer.from(await readPhoto(migrated,f.storage)),png);
 assert.equal((await migrateLegacyPhotos(f.db,f.storage,true)).photos,0);
 assert.equal(mayReadPhoto(migrated,false,true),true);
 }finally{await f.close();}
});
test('dry-run writes nothing; explicit mappings import privately into drafts and rerun without duplicates',async()=>{
 const f=await fixture();try{
 await writeFile(path.join(f.root,'one.png'),png);await f.repo.publish(f.p.id,f.p.version,'test');
 const before=await f.repo.get(f.p.id);
 const manifest={version:1,photos:[{propertyId:f.p.id,file:'one.png',source:{system:'drive',id:'drive-1'},alt:'Site photo'},{propertyId:f.p.id,file:'one.png',source:{system:'drive',id:'drive-2'},alt:'Duplicate bytes'}]};
 const dry=await importPropertyPhotos(f.db,manifest,f.root,f.storage);assert.equal(dry.newPhotos,1);
 assert.deepEqual(await f.repo.get(f.p.id),before);assert.equal((await f.db.query('SELECT * FROM property_photos')).rows.length,0);await assert.rejects(readdir(path.join(f.root,'objects')));
 await importPropertyPhotos(f.db,manifest,f.root,f.storage,true);
 const after=await f.repo.get(f.p.id);assert.deepEqual(after!.published,before!.published);assert.equal(after!.draft.media.length,before!.draft.media.length+1);
 await importPropertyPhotos(f.db,manifest,f.root,f.storage,true);assert.deepEqual(await f.repo.get(f.p.id),after);
 const photos=(await f.db.query<StoredPhoto>('SELECT * FROM property_photos')).rows;assert.equal(photos.length,1);assert.equal(photos[0].staff_only,true);
 assert.equal(mayReadPhoto(photos[0],false,false),false);assert.equal(mayReadPhoto(photos[0],false,true),false);assert.equal(mayReadPhoto(photos[0],true,false),true);
 // Existing published-photo behavior remains separate, even for identical bytes.
 const publicPhoto=await savePhoto(f.db,f.p.id,png,{storage:f.storage});assert.notEqual(publicPhoto.id,photos[0].id);
 const different=Buffer.concat([png,Buffer.from('new')]);await writeFile(path.join(f.root,'one.png'),different);
 await assert.rejects(importPropertyPhotos(f.db,manifest,f.root,f.storage,true),/different content/);
 assert.deepEqual(await f.repo.get(f.p.id),after);
 }finally{await f.close();}
});
test('preflight catches missing mappings and escaping paths before any writes',async()=>{
 const f=await fixture();try{
 await writeFile(path.join(f.root,'one.png'),png);
 const base={file:'one.png',source:{system:'drive',id:'x'},alt:'Photo'};
 await assert.rejects(importPropertyPhotos(f.db,{version:1,photos:[{...base,propertyId:f.p.id},{...base,propertyId:randomUUID()}]},f.root,f.storage,true),/does not exist/);
 assert.equal((await f.db.query('SELECT * FROM property_photos')).rows.length,0);
 await assert.rejects(readImportPhoto(f.root,path.join(f.root,'one.png')),/relative/);
 await mkdir(path.join(f.root,'source'));await assert.rejects(readImportPhoto(path.join(f.root,'source'),'../one.png'),/escapes/);
 }finally{await f.close();}
});
test('migration upgrades the original schema without erasing legacy data',async()=>{
 const pg=new PGlite(),db=embeddedDatabase(pg),repo=new PropertyRepository(db);
 try{await repo.initialize();await db.query(photoMigration);const p=await repo.create(seeds[0],'test'),id=randomUUID();
 await db.query('INSERT INTO property_photos(id,property_id,mime,content) VALUES($1,$2,$3,$4)',[id,p.id,'image/png',png.toString('base64')]);
 await initializePhotoStorage(db);await initializePhotoStorage(db);
 const row=(await db.query<StoredPhoto>('SELECT * FROM property_photos')).rows[0];assert.equal(row.id,id);assert.equal(row.content,png.toString('base64'));assert.equal(row.staff_only,false);
 }finally{await pg.close();}
});
test('Supabase adapter uses private authenticated object operations and verifies resumed uploads',async()=>{
 let bucket='',upsert:unknown;
 const client={storage:{from:(name:string)=>{bucket=name;return {upload:async(_key:string,_bytes:Uint8Array,opts:{upsert:boolean})=>{upsert=opts.upsert;return {error:{statusCode:'409'}};},download:async()=>({data:new Blob([png]),error:null})};}}} as unknown as SupabaseClient;
 const storage=supabasePhotoStorage(client),key=`${randomUUID()}/${checksum(png)}.png`;
 await storage.put(key,png,'image/png');assert.equal(bucket,'property-photos');assert.equal(upsert,false);assert.deepEqual(Buffer.from(await storage.get(key)),png);
 await assert.rejects(storage.put(key,Buffer.from('different'),'image/png'),/verified/);
 assert.throws(()=>photoStorage('unknown'),/PHOTO_STORAGE_BACKEND/);
});

test('interrupted imports resume committed items without duplicating draft media',async()=>{
 const f=await fixture();try{
 await writeFile(path.join(f.root,'one.png'),png);await writeFile(path.join(f.root,'two.png'),Buffer.concat([png,Buffer.from('second')]));
 const manifest={version:1,photos:['one.png','two.png'].map((file,i)=>({file,propertyId:f.p.id,source:{system:'drive',id:'source-'+i},alt:'Site image'}))};
 let writes=0;const interrupted:PhotoObjectStorage={...f.storage,put:async(...args)=>{if(++writes===2)throw new Error('Simulated interruption');await f.storage.put(...args);}};
 await assert.rejects(importPropertyPhotos(f.db,manifest,f.root,interrupted,true),/interruption/);
 assert.equal((await f.db.query('SELECT * FROM property_photos')).rows.length,1);
 await importPropertyPhotos(f.db,manifest,f.root,f.storage,true);
 assert.equal((await f.db.query('SELECT * FROM property_photos')).rows.length,2);
 assert.equal((await f.repo.get(f.p.id))!.draft.media.length,f.p.draft.media.length+2);
 }finally{await f.close();}
});
test('CLI dry-run works against an offline fixture and leaves metadata/drafts/objects unchanged',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'land-photo-cli-')),dbPath=path.join(root,'db');
 try{
 const pg=new PGlite(dbPath),db=embeddedDatabase(pg),repo=new PropertyRepository(db);await repo.initialize();const p=await repo.create(seeds[0],'test');await pg.close();
 await writeFile(path.join(root,'one.png'),png);await writeFile(path.join(root,'manifest.json'),JSON.stringify({version:1,photos:[{propertyId:p.id,file:'one.png',source:{system:'drive',id:'test-source'},alt:'Test photo'}]}));
 const {stdout}=await promisify(execFile)(process.execPath,['--import','tsx','scripts/import-property-photos.ts','--local='+dbPath,'--storage-root='+path.join(root,'objects'),'--source-root='+root,'--manifest='+path.join(root,'manifest.json'),'--offline-confirmed']);
 const result=JSON.parse(stdout);assert.equal(result.mode,'dry-run');assert.equal(result.newPhotos,1);assert.equal(result.mapping[0].propertyId,p.id);
 await assert.rejects(readdir(path.join(root,'objects')));
 const check=new PGlite(dbPath);try{
 assert.equal((await check.query<{present:boolean}>("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='property_photos') AS present")).rows[0].present,false);
 assert.deepEqual((await new PropertyRepository(embeddedDatabase(check)).get(p.id))!.draft,p.draft);
 }finally{await check.close();}
 }finally{await rm(root,{recursive:true,force:true});}
});

test('20 MiB is inclusive for uploads and importer files; larger files are rejected',async()=>{
 assert.equal(MAX_PHOTO_BYTES,20_971_520);
 const bytes=Buffer.alloc(MAX_PHOTO_BYTES);png.copy(bytes);
 assert.equal(inspectPhoto(bytes).size,MAX_PHOTO_BYTES);
 assert.throws(()=>inspectPhoto(Buffer.concat([bytes,Buffer.from([0])])),/20 MiB/);
 const root=await mkdtemp(path.join(os.tmpdir(),'land-photo-limit-'));
 try{
 await writeFile(path.join(root,'exact.png'),bytes);
 assert.equal((await readImportPhoto(root,'exact.png')).length,MAX_PHOTO_BYTES);
 await writeFile(path.join(root,'over.png'),Buffer.concat([bytes,Buffer.from([0])]));
 await assert.rejects(readImportPhoto(root,'over.png'),/20 MiB/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('bucket verification checks exact bytes, privacy and MIME restrictions without changing metadata',()=>{
 const bucket={public:false,file_size_limit:MAX_PHOTO_BYTES,allowed_mime_types:[...PHOTO_MIME_TYPES]};
 assert.deepEqual(photoBucketIssues(bucket),[]);
 assert.deepEqual(photoBucketIssues({...bucket,file_size_limit:String(MAX_PHOTO_BYTES)}),[]);
 assert.match(photoBucketIssues({...bucket,file_size_limit:20_000_000})[0],/observed 20000000/);
 assert.match(photoBucketIssues({...bucket,file_size_limit:10*1024*1024})[0],/20971520/);
 assert.ok(photoBucketIssues({...bucket,file_size_limit:null}).length);
 assert.ok(photoBucketIssues({...bucket,public:true}).length);
 assert.ok(photoBucketIssues({...bucket,allowed_mime_types:null}).length);
 assert.ok(photoBucketIssues({...bucket,allowed_mime_types:['image/*']}).length);
 assert.equal(bucket.file_size_limit,MAX_PHOTO_BYTES);assert.equal(bucket.public,false);
});
