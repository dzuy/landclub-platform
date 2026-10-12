import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {PropertyRepository} from '../src/lib/repository';
import {fetchNotionProperties} from '../src/lib/notion-live';
import {mapNotionProperty} from '../src/lib/notion-property-import';
import {syncNotionRecords} from '../src/lib/notion-sync';
import {mapPlatformPage,platformTypes,PLATFORM_SOURCE,PROXIMITY_SOURCE,INTERNAL_SOURCE,fetchPlatformProperties} from '../src/lib/notion-platform';
const norden='3f2d020ec9d481a0a6b5f4a9c081a222',shelter='3f2d020ec9d4817e8971d6481e0fa5fb',old='3acd020ec9d481839a7ac5c13daf7a1b',placeId='3f2d020ec9d4814e8088f997b04cd3fe';
function prop(type:string,value:unknown):Record<string,unknown>{
 if(type==='title'||type==='rich_text')return {type,[type]:value?[{plain_text:value}]:[]};
 if(type==='select')return {type,select:value?{name:value}:null};
 if(type==='multi_select')return {type,multi_select:(value as string[]??[]).map(name=>({name}))};
 if(type==='relation')return {type,relation:(value as string[]??[]).map(id=>({id})),has_more:false};
 return {type,[type]:value??null};
}
export function platformPage(id=norden,values:Record<string,unknown>={}){return {object:'page',id,url:`https://www.notion.so/${id}`,last_edited_time:'2026-10-07T20:01:49.783Z',properties:Object.fromEntries(Object.entries(platformTypes).map(([k,t])=>[k,prop(t,({property_name:'Norden Cross',property_type:'mountain',status:'Owned',region_label:'Donner Summit',one_line_descriptor:'A mountain village in the making',total_acres:19.07,elevation:6840,state:'California',county:'Placer',country:'United States',development_stage:'raw',year_round_access:'no',road_access:'seasonal',internal_record:[old],...values} as Record<string,unknown>)[k])]))};}
function place(values:Record<string,unknown>={}){const types={name:'title',kind:'select',minutes:'number',miles:'number',notes:'rich_text',property:'relation'};return {object:'page',id:placeId,url:`https://www.notion.so/${placeId}`,last_edited_time:'2026-10-07T20:00:00Z',properties:Object.fromEntries(Object.entries(types).map(([k,t])=>[k,prop(t,({name:'Truckee',kind:'town',minutes:13,miles:13,notes:'Deck: 13 min/13 miles. OSRM: about 25 minutes/15 miles.',property:[norden],...values} as Record<string,unknown>)[k])]))};}
function transport(properties:unknown[],places:unknown[]){return (async(url:unknown)=>new Response(JSON.stringify({object:'list',results:String(url).includes(PROXIMITY_SOURCE)?places:properties,has_more:false,next_cursor:null}))) as typeof fetch;}
test('platform facts preserve false, planned narratives, listing separation and unknown numeric proximity',async()=>{
 const a=platformPage(norden,{proximity:[placeId],planned_structures:'Fourteen cabins proposed',shared_amenities:'Sauna under discussion',google_drive:'https://drive.google.com/drive/folders/example'});
 const b=platformPage(shelter,{property_name:'Shelter Cove',property_type:'coastal',status:'Prospective',total_acres:0.35,elevation:81,development_stage:'built',year_round_access:null,existing_structures:'Castle Inn: 8,000 sq ft, 7 bed / 8 bath',internal_record:[],list_price:2695000,list_price_currency:'USD'});
 const {rows}=await fetchPlatformProperties('test',transport([a,b],[place({minutes:null})]));
 assert.equal(rows[0].platform.facts.year_round_access?.value,false);
 assert.equal(rows[0].platform.facts.planned_structures?.state,'Planned');
 assert.equal(rows[0].platform.facts.shared_amenities?.state,'Planned');
 assert.match(rows[0].platform.facts.total_acres!.notes!,/conflict/);
 assert.equal(rows[0].platform.proximity[0].minutes.value,null);
 assert.equal(rows[0].platform.proximity[0].minutes.state,'Not yet determined');
 assert.equal(rows[0].platform.proximity[0].miles.value,13);
 assert.equal(rows[1].platform.category,'Coast');assert.equal(rows[1].platform.facts.total_acres?.value,0.35);
 assert.equal(rows[1].platform.source?.platform?.listing?.amount,2695000);
 assert.equal(rows[1].platform.facts.share_price,undefined);assert.equal(rows[1].platform.facts.year_round_access,undefined);
 assert.equal(rows[0].platform.hero,'');assert.equal(rows[0].platform.intro,'');assert.deepEqual(rows[0].platform.gallery,[]);
 assert.equal(JSON.stringify(rows[0].platform).includes(old),false);
});
test('migration uses relation identity, preserves curated fields and publication, repeats without duplicates',async()=>{
 const db=new PGlite(),repo=new PropertyRepository(embeddedDatabase(db));await repo.initialize();
 try{
 const legacy=mapNotionProperty({pageId:old,url:`https://www.notion.so/${old}`,name:'Norden Cross',location:'Placer County, CA',acreage:'20 acres',status:['Active'],tags:['Mountain'],existingStructures:[]});
 legacy.intro='Curated story';legacy.hero='/images/cabin.jpg';legacy.facts.power={state:'Planned',value:'Solar'};
 let record=await repo.create(legacy,'test');await repo.publish(record.id,record.version,'test');
 const incoming=mapPlatformPage(platformPage(norden,{planned_structures:'First cabin planned'}),[]);
 const first=await syncNotionRecords(repo,[incoming],PLATFORM_SOURCE,'test');assert.equal(first.created,0);assert.equal(first.updated,1);
 record=(await repo.list())[0];assert.equal(record.draft.slug,legacy.slug);assert.equal(record.draft.source?.pageId,norden);
 assert.equal(record.draft.intro,'Curated story');assert.equal(record.draft.hero,'/images/cabin.jpg');assert.equal(record.draft.facts.power?.value,'Solar');
 assert.equal(record.draft.facts.total_acres?.value,20);assert.ok(record.draft.source?.sync?.conflicts.some(v=>v.field==='facts.total_acres'));
 assert.equal(record.draft.facts.elevation?.value,6840);assert.equal(record.draft.facts.year_round_access?.value,false);
 assert.equal(record.published?.source?.pageId,old);assert.equal(record.published?.facts.elevation,undefined);
 const second=await syncNotionRecords(repo,[incoming],PLATFORM_SOURCE,'test');assert.equal(second.unchanged,1);assert.equal((await repo.list()).length,1);
 assert.equal(JSON.stringify(await repo.publicList()).includes('driveFolder'),false);
 }finally{await db.close();}
});
test('blank fields preserve imported content and local proximity edits become conflicts',async()=>{
 const db=new PGlite(),repo=new PropertyRepository(embeddedDatabase(db));await repo.initialize();
 try{
 const {rows}=await fetchPlatformProperties('test',transport([platformPage(norden,{proximity:[placeId],planned_structures:'Cabins planned'})],[place()]));
 await syncNotionRecords(repo,rows,PLATFORM_SOURCE,'test');let r=(await repo.list())[0];
 await repo.save(r.id,r.version,{...r.draft,proximity:r.draft.proximity.map(p=>({...p,minutes:{state:'Actual',value:30}}))},'editor');
 const {rows:changed}=await fetchPlatformProperties('test',transport([platformPage(norden,{proximity:[placeId],planned_structures:''})],[place({minutes:25})]));
 await syncNotionRecords(repo,changed,PLATFORM_SOURCE,'test');r=(await repo.list())[0];
 assert.equal(r.draft.facts.planned_structures?.value,'Cabins planned');assert.equal(r.draft.proximity[0].minutes.value,30);assert.ok(r.draft.source?.sync?.conflicts.some(c=>c.field==='proximity'));
 }finally{await db.close();}
});
test('fails closed on inaccessible sources, partial relations, wrong types, missing reciprocal rows and old internal source',async()=>{
 await assert.rejects(fetchNotionProperties({token:'test',dataSourceId:INTERNAL_SOURCE,request:async()=>{throw Error('must not fetch')}}),/private internal/);
 await assert.rejects(fetchPlatformProperties('test',async()=>new Response('{}',{status:404})),/access failed/);
 const a=platformPage(norden,{proximity:[placeId]});
 await assert.rejects(fetchPlatformProperties('test',transport([a],[])),/Missing/);
 await assert.rejects(fetchPlatformProperties('test',transport([a],[place({property:[shelter]})])),/inconsistent/);
 await assert.rejects(fetchPlatformProperties('test',transport([platformPage()], [place()])),/Incomplete/);
 a.properties.proximity={...a.properties.proximity,has_more:true};await assert.rejects(fetchPlatformProperties('test',transport([a],[place()])));
 const wrong=platformPage();wrong.properties.year_round_access={type:'checkbox',checkbox:false};assert.throws(()=>mapPlatformPage(wrong,[]));
});
test('ambiguous identity and same-name unlinked records abort without writes',async()=>{
 const db=new PGlite(),repo=new PropertyRepository(embeddedDatabase(db));await repo.initialize();
 try{
 const incoming=mapPlatformPage(platformPage(),[]);
 const unlinked={...incoming.platform,source:undefined};await repo.create(unlinked,'test');
 await assert.rejects(syncNotionRecords(repo,[incoming],PLATFORM_SOURCE,'test'),/explicit Notion identity/);
 assert.equal((await repo.list()).length,1);
 const other=mapPlatformPage(platformPage(shelter,{property_name:'Other property'}),[]);
 await assert.rejects(syncNotionRecords(repo,[incoming,other],PLATFORM_SOURCE,'test'),/share an internal identity/);
 assert.equal((await repo.list())[0].version,1);
 }finally{await db.close();}
});
