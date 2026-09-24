import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {PropertyRepository} from '../src/lib/repository';
import {draftSchema,publicationSchema,readDraft} from '../src/lib/schema';
import {formatFact,travelTime} from '../src/lib/property-facts';
import {mapNotionProperty} from '../src/lib/notion-property-import';
import {importPropertyRecords} from '../src/lib/import-property-records';
import seeds from '../src/lib/seed-properties.json';
const rows=[
 {pageId:'11111111111111111111111111111111',url:'https://www.notion.so/11111111111111111111111111111111',name:'Norden Cross',location:'Norden, Placer County, CA',acreage:'approximately 20 acres',status:['Owned'],tags:['Mountain'],existingStructures:[]},
 {pageId:'22222222222222222222222222222222',url:'https://www.notion.so/22222222222222222222222222222222',name:'Sample Coast',location:'Sample County, CA',acreage:'12 acres',status:['Prospective'],tags:['Ocean'],existingStructures:['house']},
 {pageId:'33333333333333333333333333333333',url:'https://www.notion.so/33333333333333333333333333333333',name:'Sample Area (concept)',location:'Sample County, CA',acreage:'',status:[],tags:['Needs Scouting'],existingStructures:[]}
];
const actual=(value:string|number|boolean)=>({state:'Actual' as const,value});
const unknown={state:'Not yet determined' as const,value:null};
function available(){return readDraft({...seeds[0],offeringStatus:'Available',facts:{county:actual('Placer'),total_acres:actual(20),elevation:actual(0),topography:actual('mixed'),road_access:actual('gravel'),development_stage:actual('raw'),shares_available:actual(0),share_price:actual(0),gated:actual(false)},proximity:['airport','town'].map(kind=>({id:kind,kind,name:kind,minutes:actual(0),miles:unknown,notes:''}))});}
test('Available publication enforces core and nearby logistics; zero and false survive',()=>{
 const p=available();assert.equal(publicationSchema.safeParse(p).success,true);
 assert.equal(publicationSchema.safeParse({...p,facts:{...p.facts,county:unknown}}).success,false);
 assert.equal(publicationSchema.safeParse({...p,proximity:p.proximity.slice(1)}).success,false);
 assert.equal(publicationSchema.safeParse({...p,proximity:p.proximity.map(v=>({...v,minutes:unknown}))}).success,false);
 assert.equal(publicationSchema.safeParse({...p,recordType:'scouting-area'}).success,false);
 assert.equal(publicationSchema.safeParse({...p,offeringStatus:'Scouting',recordType:'scouting-area',facts:{},proximity:[]}).success,true);
 assert.equal(publicationSchema.safeParse({...p,offeringStatus:'Past Project',facts:{},proximity:[]}).success,true);
 assert.equal(formatFact(p.facts.gated!),'No');assert.equal(travelTime(135),'2 hr 15 min');
});
test('typed facts reject bad coordinates, negative money, fractional shares and invalid states',()=>{
 const p=available();for(const facts of [{share_price:actual(-1)},{total_shares:actual(1.5)},{gated:actual('yes')},{road_access:actual('unknown')},{county:{state:'Actual',value:null}}])assert.equal(draftSchema.safeParse({...p,facts}).success,false);
 assert.equal(draftSchema.safeParse({...p,coordinates:{state:'Actual',value:{latitude:91,longitude:0,precision:'parcel'}}}).success,false);
 assert.equal(draftSchema.safeParse({...p,media:[{id:'x',role:'render',kind:'image',url:'javascript:alert(1)',alt:'x',caption:'',state:'Planned'}]}).success,false);
});
test('Notion mapping preserves uncertainty, separates purchase data from share price and preserves duplicate names',()=>{
 const mapped=rows.map(v=>mapNotionProperty(v));assert.equal(new Set(mapped.map(v=>v.slug)).size,mapped.length);
 const n=mapped.find(v=>v.slug==='norden-cross')!;assert.equal(n.facts.total_acres?.state,'Not yet determined');assert.equal(n.facts.share_price,undefined);assert.equal(n.phases.length,0);assert.equal(n.coordinates,null);
 const s=mapped.find(v=>v.slug==='sample-area-concept')!;assert.equal(s.offeringStatus,'Scouting');
});
test('import preserves edits, public snapshots and revisions; rerun is idempotent',async()=>{
 const db=new PGlite(),repo=new PropertyRepository(embeddedDatabase(db));await repo.initialize();
 try{
 const p=await repo.create(seeds[0],'test');const pub=await repo.publish(p.id,p.version,'test');
 await repo.save(p.id,pub.version,{...pub.draft,headline:'A staff edit',facts:{power:actual('Staff-confirmed value')}},'test');
 const result=await importPropertyRecords(repo,rows,'test-import');assert.equal(result.updated,1);assert.equal(result.created,2);
 const imported=(await repo.get(p.id))!;assert.equal(imported.draft.headline,'A staff edit');assert.equal(imported.draft.facts.power?.value,'Staff-confirmed value');assert.equal((await repo.publicBySlug(p.draft.slug))?.headline,p.draft.headline);
 assert.equal((await repo.history(p.id)).length,4);
 const again=await importPropertyRecords(repo,rows,'test-import');assert.equal(again.skipped,3);assert.equal(again.updated,0);assert.equal((await repo.get(p.id))?.version,imported.version);
 await repo.publish(imported.id,imported.version,'test');assert.equal('source' in (await repo.publicBySlug(p.draft.slug))!,false);
 const next=await repo.get(p.id);await repo.save(p.id,next!.version,{...next!.draft,proximity:[{id:'town',name:'Sample town',kind:'town',minutes:actual(15),miles:unknown,notes:''}]},'test');assert.equal((await repo.publicBySlug(p.draft.slug))?.proximity.length,0);
 }finally{await db.close();}
});
