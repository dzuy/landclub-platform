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
