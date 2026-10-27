import test from 'node:test';
import assert from 'node:assert/strict';
import {removePropertyPhoto} from '../src/lib/property-photo-removal';
import {readDraft} from '../src/lib/schema';
import seeds from '../src/lib/seed-properties.json';

test('deleting a photo clears duplicate references, cover and tags without changing other photos',()=>{
 const draft=readDraft(seeds[0]),src='/images/remove.jpg',keep='/images/keep.jpg';
 draft.hero=src;draft.imageAlt='Remove';
 draft.gallery=[{src,alt:'Remove',caption:'',type:'Current property'},{src:keep,alt:'Keep',caption:'',type:'Current property'}];
 draft.media=[{id:'remove',url:src,kind:'image',role:'gallery',alt:'Remove',caption:'',state:'Actual'},{id:'keep',url:keep,kind:'image',role:'gallery',alt:'Keep',caption:'',state:'Actual'}];
 draft.photoTags={[src]:['Exterior'],[keep]:['Interior']};
 const result=removePropertyPhoto(draft,src);
 assert.equal(result.hero,'');assert.equal(result.imageAlt,'');
 assert.deepEqual(result.gallery,[draft.gallery[1]]);assert.deepEqual(result.media,[draft.media[1]]);
 assert.deepEqual(result.photoTags,{[keep]:['Interior']});
 assert.equal(draft.hero,src);assert.equal(draft.gallery.length,2);
 const nonCover=removePropertyPhoto(draft,keep);
 assert.equal(nonCover.hero,src);assert.equal(nonCover.imageAlt,'Remove');
});
