import {z} from 'zod';
import {readDraft, type PropertyDraft} from './schema';
import {factDefinitions, type FactKey, type PropertyFacts, type PropertyFact, proximitySchema} from './property-facts';
export const PLATFORM_SOURCE='eb9411209b884755b460d5e54e9cbd0a';
export const PROXIMITY_SOURCE='a09ef570a2464495b6070a8581073d81';
export const INTERNAL_SOURCE='3acd020ec9d480b0bad1000bb8caae5f';
export const normalizeId=(id:string)=>id.replaceAll('-','').toLowerCase();
const id=z.string().regex(/^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i).transform(normalizeId);
const rich=z.array(z.object({plain_text:z.string()}));
const valueSchemas={
 rich_text:z.object({type:z.literal('rich_text'),rich_text:rich}).transform(p=>p.rich_text.map(v=>v.plain_text).join('')),
 title:z.object({type:z.literal('title'),title:rich}).transform(p=>p.title.map(v=>v.plain_text).join('')),
 select:z.object({type:z.literal('select'),select:z.object({name:z.string()}).nullable()}).transform(p=>p.select?.name??null),
 number:z.object({type:z.literal('number'),number:z.number().nullable()}).transform(p=>p.number),
 multi_select:z.object({type:z.literal('multi_select'),multi_select:z.array(z.object({name:z.string()}))}).transform(p=>p.multi_select.map(v=>v.name)),
 relation:z.object({type:z.literal('relation'),relation:z.array(z.object({id})),has_more:z.literal(false).optional()}).transform(p=>p.relation.map(v=>v.id)),
 url:z.object({type:z.literal('url'),url:z.url().nullable()}).transform(p=>p.url),
};
const selects=new Set(['topography','road_access','development_stage','dues_frequency','power','water_source','septic_sewer','year_round_access','gated','financing_available']);
export const platformTypes:Record<string,keyof typeof valueSchemas>={property_name:'title',property_type:'select',status:'select',one_line_descriptor:'rich_text',long_description:'rich_text',region_label:'rich_text',coordinates:'rich_text',phasing:'rich_text',list_price:'number',list_price_currency:'select',google_drive:'url',internal_record:'relation',proximity:'relation'};
for(const [key,def] of Object.entries(factDefinitions)){
 const type='type' in def?def.type:undefined;
 platformTypes[key]=selects.has(key)?'select':type==='number'||type==='money'?'number':type==='tags'?'multi_select':'rich_text';
}
const page=z.object({object:z.literal('page'),id,url:z.url(),last_edited_time:z.string(),archived:z.boolean().optional(),in_trash:z.boolean().optional(),properties:z.record(z.string(),z.unknown())});
export type PlatformRow={pageId:string;url:string;lastEditedAt:string;platform:PropertyDraft;legacyPageIds:string[]};
function values(properties:Record<string,unknown>,types:Record<string,keyof typeof valueSchemas>){
 return Object.fromEntries(Object.entries(types).map(([key,type])=>[key,valueSchemas[type].parse(properties[key])]));
}
const present=(v:unknown)=>v!==null&&v!==undefined&&v!==''&&(!Array.isArray(v)||v.length>0);
const sourceNote='As recorded in Platform Properties; field-state columns are not supplied. Review before publication.';
const known=(value:PropertyFact['value'],state:PropertyFact['state']='Actual',notes=sourceNote)=>({value,state,notes});
export function mapPlatformPage(input:unknown,proximity:PropertyDraft['proximity'],now=new Date().toISOString()):PlatformRow{
 const p=page.parse(input),v=values(p.properties,platformTypes),facts:PropertyFacts={};
 for(const key of Object.keys(factDefinitions) as FactKey[]){
  let value:PropertyFact['value']=v[key];if(!present(value))continue;
  if(['year_round_access','gated','financing_available'].includes(key))value=z.enum(['yes','no']).parse(value)==='yes';
  const planned=key==='planned_structures'||key==='completion_timeline'||(key==='shared_amenities'&&v.development_stage!=='built');
  facts[key]=known(value as PropertyFact['value'],planned?'Planned':'Actual');
 }
 const notes=[sourceNote,'Blank source fields do not erase curated app content. Media and descriptions require separate approval.'];
 if(p.id==='3f2d020ec9d481a0a6b5f4a9c081a222'){
  if(facts.total_acres)facts.total_acres.notes='Source conflict: Notion records 19.07 acres; county records total 18.15; deck/site say 20. Requires review.';
  if(facts.elevation)facts.elevation.notes='Source conflict: 6,840 ft at the approximate map point; website says 7,200 ft. Requires review.';
  notes.push('Norden zoning is historical (June 2023) under old parcel numbers and has not been re-checked.');
 }
 const name=z.string().min(1).parse(v.property_name),status=z.string().nullable().parse(v.status)??'';
 const categories:Record<string,PropertyDraft['category']>={mountain:'Mountains',farm:'Farms',coastal:'Coast',desert:'Desert',heritage:'Heritage'};
 const type=z.enum(['mountain','farm','coastal','desert','heritage']).nullable().parse(v.property_type);
 let coordinates:PropertyDraft['coordinates']=null;
 if(present(v.coordinates)){
  const match=String(v.coordinates).match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*(?:\(([^()]*)\))?\s*$/i);
  if(!match)throw new Error('Invalid Platform Properties coordinates.');
  coordinates={state:'Actual',value:{latitude:Number(match[1]),longitude:Number(match[2]),precision:'approximate'},notes:match[3]?`${sourceNote} ${match[3]}`:sourceNote};
 }
 // Listing price is private source context, never share pricing or ownership terms.
 const listing=present(v.list_price)?{amount:z.number().nonnegative().parse(v.list_price),currency:z.enum(['USD','EUR']).parse(v.list_price_currency)}:undefined;
 const draft=readDraft({name,slug:name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),region:v.region_label||[v.county,v.state,v.country].filter(present).join(', '),category:type?categories[type]:'Unclassified',status,recordType:'property',offeringStatus:null,headline:v.one_line_descriptor||'',summary:'',intro:'',hero:'',imageAlt:'',isDemo:false,gallery:[],sections:[],facts,coordinates,proximity,
  source:{system:'notion',pageId:p.id,url:p.url,importedAt:now,sourceStatus:status,reviewNotes:notes,platform:{driveFolder:v.google_drive??undefined,listing,phasing:v.phasing||undefined,descriptionCandidate:v.long_description||undefined}}});
 return {pageId:p.id,url:p.url,lastEditedAt:p.last_edited_time,platform:draft,legacyPageIds:v.internal_record as string[]};
}
export async function fetchPlatformProperties(token:string,request:typeof fetch=fetch){
 async function query(source:string){
  const results:z.infer<typeof page>[]=[],seen=new Set<string>(),cursors=new Set<string>();let cursor:string|undefined;
  do{
   const r=await request(`https://api.notion.com/v1/data_sources/${source}/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Notion-Version':'2025-09-03','Content-Type':'application/json'},body:JSON.stringify({page_size:100,...(cursor?{start_cursor:cursor}:{})}),signal:AbortSignal.timeout(15000),redirect:'error',cache:'no-store'});
   if(!r.ok)throw new Error(`Notion ${source===PLATFORM_SOURCE?'Platform Properties':'Property Proximity'} access failed (${r.status}). Check the Land Club Platform connection. No data was changed.`);
   const result=z.object({object:z.literal('list'),results:z.array(page),has_more:z.boolean(),next_cursor:z.string().nullable()}).parse(await r.json());
   for(const p of result.results){if(seen.has(p.id))throw new Error('Duplicate Notion page ID.');seen.add(p.id);if(!p.archived&&!p.in_trash)results.push(p);}
   if(!result.has_more)break;
   if(!result.next_cursor||cursors.has(result.next_cursor)||cursors.size>=100)throw new Error('Notion pagination incomplete.');
   cursor=result.next_cursor;cursors.add(cursor);
  }while(true);
  return results;
 }
 // Both complete sources must validate before any app writes, including relation edits.
 const properties=await query(PLATFORM_SOURCE),nearby=await query(PROXIMITY_SOURCE);
 const places=nearby.map(p=>{
  const v=values(p.properties,{name:'title',kind:'select',minutes:'number',miles:'number',notes:'rich_text',property:'relation'});
  const numeric=(value:unknown)=>value===null?{state:'Not yet determined',value:null}:{state:'Actual',value};
  return {pageId:p.id,parents:v.property as string[],value:proximitySchema.parse({id:p.id,name:v.name,kind:v.kind,minutes:numeric(v.minutes),miles:numeric(v.miles),notes:v.notes})};
 });
 const rows=properties.map(p=>{
  const ids=valueSchemas.relation.parse(p.properties.proximity);
  const related=ids.map(id=>{const item=places.find(v=>v.pageId===id);if(!item||!item.parents.includes(p.id))throw new Error('Missing or inconsistent Proximity relation. No data was changed.');return item.value;});
  if(places.some(v=>v.parents.includes(p.id)&&!ids.includes(v.pageId)))throw new Error('Incomplete Proximity relation. No data was changed.');
  return mapPlatformPage(p,related.sort((a,b)=>a.id.localeCompare(b.id)));
 });
 return {rows,dataSourceId:PLATFORM_SOURCE};
}
