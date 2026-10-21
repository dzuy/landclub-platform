import test from 'node:test';
import assert from 'node:assert/strict';
import {memberPropertyPresentation} from '../src/lib/member-property-presentation';
import {readDraft,type PropertyRecord} from '../src/lib/schema';
import seeds from '../src/lib/seed-properties.json';

test('saved selections appear once, retain existing roles, prefer published content and omit stale/company selections',async()=>{
 const draft=readDraft(seeds[0]);
 const records:Record<string,PropertyRecord>={
  a:{id:'a',draft:{...draft,name:'Unpublished edits'},published:{...draft,name:'Alpha'},version:1,published_at:null,updated_at:''},
  b:{id:'b',draft:{...draft,name:'Beta'},published:null,version:1,published_at:null,updated_at:''},
 };
 const list=await memberPropertyPresentation([{property_id:'a',roles:['guest']}],[{kind:'property',id:'a'},{kind:'property',id:'b'},{kind:'property',id:'b'},{kind:'property',id:'deleted'},{kind:'company',id:'land-club-llc'}],async id=>records[id]??null);
 assert.deepEqual(list.map(p=>({id:p.id,name:p.property.name,roles:p.roles,selected:p.selectionOnly,unpublished:p.unpublished})),[
  {id:'a',name:'Alpha',roles:['guest'],selected:false,unpublished:false},
  {id:'b',name:'Beta',roles:[],selected:true,unpublished:true},
 ]);
 assert.equal('source' in list[1].property,false,'Editorial source metadata stays private');
 assert.deepEqual(await memberPropertyPresentation([],[],async id=>records[id]??null),[]);
});
