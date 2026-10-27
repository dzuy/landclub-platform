import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {PropertyRepository,ConflictError} from '../src/lib/repository';
import {draftSchema} from '../src/lib/schema';
import seeds from '../src/lib/seed-properties.json';
test('draft/publication isolation, conflicts, unique slugs, audit and unpublish',async()=>{
 const db=new PGlite(),repo=new PropertyRepository(embeddedDatabase(db));await repo.initialize();
 const initial=await repo.create(seeds[0],'test-staff');assert.equal(await repo.publicBySlug(initial.draft.slug),null);
 const published=await repo.publish(initial.id,initial.version,'test-staff');assert.equal((await repo.publicBySlug(initial.draft.slug))?.name,initial.draft.name);
 const edited=await repo.save(initial.id,published.version,{...initial.draft,name:'Private unfinished title'},'test-staff');
 assert.equal((await repo.publicBySlug(initial.draft.slug))?.name,initial.draft.name);
 await assert.rejects(repo.save(initial.id,published.version,initial.draft,'other-window'),ConflictError);
 await assert.rejects(repo.publish(initial.id,published.version,'other-window'),ConflictError);
 await assert.rejects(repo.create(initial.draft,'test-staff'));
 const renamed=await repo.save(initial.id,edited.version,{...edited.draft,slug:'new-public-address'},'test-staff');await repo.publish(initial.id,renamed.version,'test-staff');
 assert.equal(await repo.publicBySlug(initial.draft.slug),null);assert.equal((await repo.publicBySlug('new-public-address'))?.name,'Private unfinished title');
 const current=await repo.get(initial.id);assert.ok(current);await repo.unpublish(initial.id,current.version,'test-staff');assert.equal((await repo.publicList()).length,0);assert.equal((await repo.get(initial.id))?.draft.name,'Private unfinished title');
 assert.deepEqual((await repo.history(initial.id)).map(h=>h.action),['unpublished','published','saved','saved','published','created']);await db.close();
});
test('demo seed validates; invalid image URLs and duplicate sections rejected',()=>{for(const seed of seeds)draftSchema.parse(seed);assert.equal(draftSchema.safeParse({...seeds[0],hero:'javascript:alert(1)'}).success,false);assert.equal(draftSchema.safeParse({...seeds[0],sections:[seeds[0].sections[0],seeds[0].sections[0]]}).success,false);});

test('staff shortcut only works on explicit loopback development',async()=>{const {localStaffAllowed}=await import('../src/lib/local-access');assert.equal(localStaffAllowed('development','1','127.0.0.1:3000'),true);assert.equal(localStaffAllowed('development','1','localhost:3000'),true);for(const [mode,flag,host] of [['production','1','localhost:3000'],['development','0','localhost:3000'],['development','1','app.land.club'],['development','1','localhost:3000.attacker.test']])assert.equal(localStaffAllowed(mode,flag,host),false);});

test('editor saves update active pages atomically while drafts stay private',async()=>{
 const db=new PGlite(),repo=new PropertyRepository(embeddedDatabase(db));
 try{
  await repo.initialize();
  const initial=await repo.create(seeds[0],'test-staff');
  const draft=await repo.save(initial.id,initial.version,{...initial.draft,name:'Draft edit'},'test-staff',true);
  assert.equal(draft.published,null);assert.equal((await repo.publicList()).length,0);
  const active=await repo.publish(draft.id,draft.version,'test-staff');
  const saved=await repo.save(active.id,active.version,{...active.draft,name:'Live edit',slug:'live-new-address'},'test-staff',true);
  assert.deepEqual(saved.published,saved.draft);
  assert.equal((await repo.publicBySlug('live-new-address'))?.name,'Live edit');
  assert.equal(await repo.publicBySlug(initial.draft.slug),null);
  await assert.rejects(repo.save(active.id,active.version,active.draft,'stale-window',true),ConflictError);
  await assert.rejects(repo.save(saved.id,saved.version,{...saved.draft,hero:'javascript:alert(1)'},'test-staff',true));
  assert.deepEqual(await repo.get(saved.id),saved);
  const offline=await repo.unpublish(saved.id,saved.version,'test-staff');
  const privateEdit=await repo.save(offline.id,offline.version,{...offline.draft,name:'Private again'},'test-staff',true);
  assert.equal(privateEdit.published,null);assert.equal((await repo.publicList()).length,0);
 }finally{await db.close();}
});

test('local preview re-entry is unavailable with hosted data or configured authentication',async()=>{
 const {localPreviewSignInAllowed:allowed}=await import('../src/lib/local-access');
 assert.equal(allowed('development','1','127.0.0.1:3000',undefined,false),true);
 for(const args of [ ['production','1','127.0.0.1:3000',undefined,false], ['development','1','example.com',undefined,false], ['development','0','127.0.0.1:3000',undefined,false], ['development','1','127.0.0.1:3000','postgres://configured',false], ['development','1','127.0.0.1:3000',undefined,true] ] as const)assert.equal(allowed(args[0],args[1],args[2],args[3],args[4]),false);
});


test('custom local preview port preserves development, loopback and credential guards',async()=>{
 const {localStaffAllowed,localPreviewSignInAllowed}=await import('../src/lib/local-access');
 assert.equal(localStaffAllowed('development','1','127.0.0.1:3030','3030'),true);
 assert.equal(localStaffAllowed('development','1','localhost:3030','3030'),true);
 for(const [mode,flag,host,port] of [['production','1','localhost:3030','3030'],['development','0','localhost:3030','3030'],['development','1','localhost:3000','3030'],['development','1','app.land.club:3030','3030'],['development','1','localhost:3030.attacker.test','3030'],['development','1','localhost:65536','65536'],['development','1','localhost:0','0'],['development','1','localhost:3030','.*']])assert.equal(localStaffAllowed(mode,flag,host,port),false);
 assert.equal(localPreviewSignInAllowed('development','1','localhost:3030',undefined,false,'3030'),true);
 assert.equal(localPreviewSignInAllowed('development','1','localhost:3030','postgres://example',false,'3030'),false);
 assert.equal(localPreviewSignInAllowed('development','1','localhost:3030',undefined,true,'3030'),false);
});
