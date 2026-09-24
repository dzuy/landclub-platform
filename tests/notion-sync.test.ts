import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {PropertyRepository} from '../src/lib/repository';
import {fetchNotionProperties,type LiveNotionRow} from '../src/lib/notion-live';
import {syncNotionRecords} from '../src/lib/notion-sync';
import {applySyncedField} from '../src/lib/notion-sync-fields';
import {importPropertyRecords} from '../src/lib/import-property-records';
const dataSourceId='cccccccc-cccc-cccc-cccc-cccccccccccc';
const ds=dataSourceId.replaceAll('-','');
const row:LiveNotionRow={pageId:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',url:'https://www.notion.so/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',name:'Test farm',location:'Napa County, CA',acreage:'12 acres',status:['Prospective'],tags:['Farm'],existingStructures:['house'],lastEditedAt:'2026-09-23T12:00:00Z'};
const text=(s:string)=>({type:'rich_text',rich_text:[{plain_text:s}]}),multi=(v:string[])=>({type:'multi_select',multi_select:v.map(name=>({name}))});
function page(r=row){return {object:'page',id:r.pageId,url:r.url,last_edited_time:r.lastEditedAt,properties:{Name:{type:'title',title:[{plain_text:r.name}]},Location:text(r.location),Acreage:text(r.acreage),Status:multi(r.status),Tags:multi(r.tags),'Existing Structures':multi(r.existingStructures)}};}
const response=(results:unknown[],has_more=false,next_cursor:string|null=null)=>new Response(JSON.stringify({object:'list',results,has_more,next_cursor}));
test('live fetch paginates and validates complete results, with server authorization',async()=>{
 const requests:RequestInit[]=[];const pages=[response([page()],true,'next'),response([page({...row,pageId:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',name:'Second'})])];
 const result=await fetchNotionProperties({token:'test-token',dataSourceId,request:async(url,init)=>{assert.equal(String(url),`https://api.notion.com/v1/data_sources/${dataSourceId}/query`);requests.push(init!);return pages.shift()!;}});
 assert.equal(result.rows.length,2);assert.equal(result.dataSourceId,ds);assert.equal(JSON.parse(String(requests[1].body)).start_cursor,'next');assert.equal((requests[0].headers as Record<string,string>).Authorization,'Bearer test-token');
 await assert.rejects(fetchNotionProperties({token:'',request:async()=>{throw Error('must not call');}}),/not connected/);
 await assert.rejects(fetchNotionProperties({token:'test',request:async()=>new Response('',{status:403})}),/NOTION_DATA_SOURCE_ID/);
 await assert.rejects(fetchNotionProperties({token:'test',dataSourceId,request:async()=>new Response('',{status:403})}),/access failed/);
 let calls=0;await assert.rejects(fetchNotionProperties({token:'test',dataSourceId,request:async()=>++calls===1?response([page()],true,'next'):response([{object:'page'}])}),/fields differ/);
});
test('sync updates by ID after rename, keeps published content, and persists conflicts',async()=>{
 const db=new PGlite(),repo=new PropertyRepository(embeddedDatabase(db));await repo.initialize();
 try{
 assert.equal((await syncNotionRecords(repo,[row],ds,'test')).created,1);
 let record=(await repo.list())[0];const slug=record.draft.slug;
 const saved=await repo.save(record.id,record.version,{...record.draft,hero:'/images/farm.jpg',offeringStatus:'Coming Soon'},'editor');await repo.publish(saved.id,saved.version,'editor');
 const changed={...row,name:'Renamed farm',acreage:'15 acres',lastEditedAt:'2026-09-24T12:00:00Z'};
 assert.equal((await syncNotionRecords(repo,[changed],ds,'test')).updated,1);
 record=(await repo.list())[0];assert.equal(record.draft.name,'Renamed farm');assert.equal(record.draft.slug,slug);assert.equal(record.draft.facts.total_acres?.value,15);assert.equal(record.published?.name,'Test farm');
 const version=record.version;assert.equal((await syncNotionRecords(repo,[changed],ds,'test')).unchanged,1);assert.equal((await repo.list())[0].version,version);
 await repo.save(record.id,record.version,{...record.draft,facts:{...record.draft.facts,total_acres:{state:'Actual',value:17}}},'editor');
 const remote={...changed,acreage:'19 acres'};assert.equal((await syncNotionRecords(repo,[remote],ds,'test')).conflicts.length,1);
 record=(await repo.list())[0];assert.equal(record.draft.facts.total_acres?.value,17);assert.equal(record.draft.source?.sync?.conflicts[0].field,'facts.total_acres');
 await syncNotionRecords(repo,[remote],ds,'test');record=(await repo.list())[0];assert.equal(record.draft.source?.sync?.conflicts.length,1);
 const conflict=record.draft.source!.sync!.conflicts[0];const resolved=applySyncedField(record.draft,conflict.field,conflict.notion);resolved.source!.sync!.baseline[conflict.field]=conflict.notion;resolved.source!.sync!.conflicts=[];
 await repo.save(record.id,record.version,resolved,'editor');await syncNotionRecords(repo,[remote],ds,'test');record=(await repo.list())[0];assert.equal(record.draft.facts.total_acres?.value,19);assert.equal(record.draft.source?.sync?.conflicts.length,0);
 assert.equal((await syncNotionRecords(repo,[],ds,'test')).missing,1);record=(await repo.list())[0];assert.equal(record.draft.source?.sync?.missing,true);assert.equal(record.published?.name,'Test farm');
 await syncNotionRecords(repo,[remote],ds,'test');assert.equal((await repo.list())[0].draft.source?.sync?.missing,false);
 }finally{await db.close();}
});
test('legacy imports preserve app edits and surface first-sync differences as conflicts',async()=>{
 const db=new PGlite(),repo=new PropertyRepository(embeddedDatabase(db));await repo.initialize();
 try{
 const original={...row,lastEditedAt:undefined};await importPropertyRecords(repo,[original],'test');
 const source={...row,location:'New county location',lastEditedAt:'2026-09-24T00:00:00Z'};
 const result=await syncNotionRecords(repo,[source],ds,'test');assert.equal(result.created,0);assert.equal((await repo.list()).length,1);
 const p=(await repo.list())[0].draft;assert.equal(p.region,'Napa County, CA');assert.ok(p.source?.sync?.conflicts.some(c=>c.field==='region'));
 }finally{await db.close();}
});
test('concurrent syncs do not duplicate; a validation failure rolls back the whole sync',async()=>{
 const db=new PGlite(),repo=new PropertyRepository(embeddedDatabase(db));await repo.initialize();
 try{
 await Promise.all([syncNotionRecords(repo,[row],ds,'a'),syncNotionRecords(repo,[row],ds,'b')]);assert.equal((await repo.list()).length,1);
 const before=(await repo.list())[0];await assert.rejects(syncNotionRecords(repo,[{...row,name:'Change first'},{...row,pageId:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',name:'x'.repeat(200)}],ds,'test'));
 const after=(await repo.list())[0];assert.equal(after.draft.name,before.draft.name);assert.equal(after.version,before.version);assert.equal((await repo.list()).length,1);
 }finally{await db.close();}
});
