// This command cannot apply changes. Production is opened READ ONLY; all writes
// run in disposable in-memory PGlite. Snapshot mode is explicitly a partial comparison.
import {isDeepStrictEqual} from 'node:util';
import {readFile} from 'node:fs/promises';
import {Client} from 'pg';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {PropertyRepository} from '../src/lib/repository';
import {fetchPlatformProperties,platformTypes,PROXIMITY_SOURCE} from '../src/lib/notion-platform';
import {syncNotionRecords} from '../src/lib/notion-sync';
import type {PropertyRecord} from '../src/lib/schema';
async function main(){
 const args=process.argv.slice(2);if(args.length>1||args.some(a=>!a.startsWith('--snapshot=')))throw Error('Only --snapshot=path is supported. No apply mode exists.');
 let source;
 if(args[0]){
  const snapshot=JSON.parse(await readFile(args[0].slice(11),'utf8'));
  function page(p:{id:string;lastEditedAt:string;properties:Record<string,unknown>},types:Record<string,string>){return {object:'page',id:p.id,url:`https://www.notion.so/${p.id}`,last_edited_time:p.lastEditedAt,properties:Object.fromEntries(Object.entries(types).map(([k,type])=>{
   const value=p.properties[k];let mapped:unknown=value??null;
   if(type==='title'||type==='rich_text')mapped=value?[{plain_text:value}]:[];
   if(type==='select')mapped=value?{name:value}:null;
   if(type==='relation')mapped=((value??[]) as string[]).map(url=>({id:url.split('/').pop()}));
   if(type==='multi_select')mapped=((value??[]) as string[]).map(name=>({name}));
   return [k,{type,[type]:mapped,...(type==='relation'?{has_more:false}:{})}];
  }))};}
  const properties=snapshot.properties.map((p:Parameters<typeof page>[0])=>page(p,platformTypes));
  const proximity=snapshot.proximity.map((p:Parameters<typeof page>[0])=>page(p,{name:'title',kind:'select',minutes:'number',miles:'number',notes:'rich_text',property:'relation'}));
  source=await fetchPlatformProperties('snapshot',async url=>new Response(JSON.stringify({object:'list',results:String(url).includes(PROXIMITY_SOURCE)?proximity:properties,has_more:false,next_cursor:null})));
 }else{
  if(!process.env.NOTION_TOKEN)throw Error('NOTION_TOKEN required.');
  source=await fetchPlatformProperties(process.env.NOTION_TOKEN);
 }
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required for read-only comparison.');
 const client=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000,statement_timeout:10000});
 let before:PropertyRecord[];
 try{await client.connect();await client.query('BEGIN READ ONLY');before=(await client.query('SELECT * FROM land_club.properties')).rows;await client.query('ROLLBACK');}finally{await client.end();}
 const memory=new PGlite(),repo=new PropertyRepository(embeddedDatabase(memory));
 try{
  await repo.initialize();
  for(const p of before)await memory.query('INSERT INTO properties(id,draft,published,version,published_at,updated_at) VALUES($1,$2,$3,$4,$5,$6)',[p.id,p.draft,p.published,p.version,p.published_at,p.updated_at]);
  const result=await syncNotionRecords(repo,source.rows,source.dataSourceId,'preview-only');
  const after=await repo.list();
  const comparison=after.filter(a=>a.version!==before.find(b=>b.id===a.id)?.version).map(a=>{
   const b=before.find(b=>b.id===a.id);
   if(!isDeepStrictEqual(a.published,b?.published??null))throw Error('Preview changed published content.');
   return {id:a.id,name:a.draft.name,sourceBefore:b?.draft.source?.pageId,sourceAfter:a.draft.source?.pageId,slugPreserved:a.draft.slug===b?.draft.slug,conflicts:a.draft.source?.sync?.conflicts.map(c=>c.field),facts:Object.keys(a.draft.facts),proximity:a.draft.proximity.length,mediaPreserved:isDeepStrictEqual(a.draft.media,b?.draft.media??[]),publishedUnchanged:true};
  });
  if(comparison.some(c=>!c.mediaPreserved))throw Error('Preview changed existing media.');
  const repeated=await syncNotionRecords(repo,source.rows,source.dataSourceId,'preview-only');
  console.log(JSON.stringify({mode:args[0]?'partial-connector-snapshot-preview':'live-source-preview',productionWrites:0,result,repeated,comparison},null,2));
 }finally{await memory.close();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Preview failed');process.exitCode=1;});
