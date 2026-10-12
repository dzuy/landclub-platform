import {notionIdentityOwners} from './notion-identities';
import {PLATFORM_SOURCE,INTERNAL_SOURCE,normalizeId} from './notion-platform';
import {readDraft,type PropertyDraft} from './schema';
import {mapNotionProperty} from './notion-property-import';
import type {LiveNotionRow} from './notion-live';
import type {PropertyRepository} from './repository';
import {projection,applySyncedField} from './notion-sync-fields';
function canonical(value:unknown):string{if(Array.isArray(value))return JSON.stringify(value.map(v=>JSON.parse(canonical(v))));if(value&&typeof value==='object')return JSON.stringify(Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,JSON.parse(canonical(v))])));return JSON.stringify(value??null);}
const equal=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
export function mergeLiveProperty(local:PropertyDraft,incoming:PropertyDraft,dataSourceId:string,lastEditedAt:string,now:string){
 const previous=local.source?.sync;
 // Records that predate live sync have no safe baseline. Treat the first incoming
 // differences as conflicts instead of relying on a private checked-in export.
 const baseline={...(previous?.baseline??{})};
 const remote=projection(incoming),current=projection({...local,source:{...local.source!,platform:incoming.source?.platform??local.source?.platform}});let draft=local;
 const conflicts:NonNullable<NonNullable<PropertyDraft['source']>['sync']>['conflicts']=[];
 for(const [field,next] of Object.entries(remote)){
  const known=Object.hasOwn(baseline,field),base=baseline[field],ours=current[field];
  // Empty platform cells mean missing source content, not an instruction to delete.
  if(incoming.source?.platform&&(next===null||next===''||(Array.isArray(next)&&!next.length)))continue;
  const empty=ours===null||ours===undefined||ours===''||(Array.isArray(ours)&&!ours.length);
  if(equal(ours,next)){baseline[field]=next;continue;}
  if(known&&equal(next,base))continue;
  if((known&&equal(ours,base))||(incoming.source?.platform&&!known&&empty)){draft=applySyncedField(draft,field,next);baseline[field]=next;}
  else conflicts.push({field,notion:next});
 }
 // Keep unresolved conflicts until resolved, including across identical subsequent syncs.
 for(const c of previous?.conflicts??[])if(!conflicts.some(v=>v.field===c.field)&&!equal(current[c.field],remote[c.field])&&equal(remote[c.field],c.notion))conflicts.push(c);
 const contentReview=previous?.contentReview===true||Boolean(previous&&previous.lastEditedAt!==lastEditedAt)||!previous;
 return readDraft({...draft,source:{...local.source!,platform:incoming.source?.platform??local.source?.platform,sourceStatus:incoming.source!.sourceStatus,sync:{dataSourceId,baseline,conflicts,missing:false,lastEditedAt,checkedAt:now,contentReview}}});
}
export async function syncNotionRecords(repo:PropertyRepository,rows:LiveNotionRow[],dataSourceId:string,actor:string){
 dataSourceId=normalizeId(dataSourceId);
 const legacyIds=new Set<string>();
 for(const row of rows)if('platform' in row){
  if(dataSourceId!==PLATFORM_SOURCE||row.platform.source?.pageId!==row.pageId)throw new Error('Platform source identity mismatch.');
  for(const id of row.legacyPageIds){if(legacyIds.has(id))throw new Error('Multiple Platform rows share an internal identity; no records changed.');legacyIds.add(id);}
 }
 // Serialize imports and concurrent app writes; failures roll back the entire run.
 return repo.locked(async locked=>{
  const records=await locked.list(),matched=new Set<string>(),seen=new Set(rows.map(r=>r.pageId));
  const identityOwners=notionIdentityOwners(records);
  if(seen.size!==rows.length)throw new Error('Duplicate Notion source rows.');
  let created=0,updated=0,unchanged=0,missing=0,skipped=0;const conflicts:string[]=[];const now=new Date().toISOString();
  for(const row of rows){
   // Retired source pages must never recreate a merged property or overwrite its canonical source.
   const owner=identityOwners.get(normalizeId(row.pageId));
   if(owner&&normalizeId(owner.draft.source!.pageId)!==normalizeId(row.pageId)){skipped++;continue;}
   const incoming='platform' in row?readDraft(row.platform):mapNotionProperty(row,now);
   const candidates=records.filter(p=>p.draft.source&&(normalizeId(p.draft.source.pageId)===row.pageId||('platform' in row&&row.legacyPageIds.includes(normalizeId(p.draft.source.pageId)))));
   if(candidates.length>1)throw new Error('Ambiguous Notion identity mapping; no records changed.');
   const existing=candidates[0];
   if(existing&&matched.has(existing.id))throw new Error('Multiple Platform rows point at one app record; no records changed.');
   if(!existing&&records.some(p=>p.draft.name.trim().toLowerCase()===incoming.name.trim().toLowerCase()))throw new Error('A same-name app record needs an explicit Notion identity mapping before importing.');
   if(existing){
    matched.add(existing.id);
    const old=existing.draft.source!;
    const migration='platform' in row&&dataSourceId===PLATFORM_SOURCE&&row.legacyPageIds.includes(normalizeId(old.pageId))&&(!old.sync||normalizeId(old.sync.dataSourceId)===INTERNAL_SOURCE);
    if(old.sync&&normalizeId(old.sync.dataSourceId)!==dataSourceId&&!migration)throw new Error('Property is already linked to another Notion data source.');
    // The relation is used only as an identity bridge. Never fetch internal property values.
    const local=migration?readDraft({...existing.draft,source:{...incoming.source,retiredPageIds:[...new Set([...(old.retiredPageIds??[]),normalizeId(old.pageId)])],importedAt:old.importedAt,reviewNotes:[...old.reviewNotes,...incoming.source!.reviewNotes],sync:undefined}}):existing.draft;
    const draft=mergeLiveProperty(local,incoming,dataSourceId,row.lastEditedAt,now);
    if(draft.source!.sync!.conflicts.length)conflicts.push(draft.name);
    const comparable=(p:PropertyDraft)=>({...p,source:p.source?{...p.source,sync:p.source.sync?{...p.source.sync,checkedAt:''}:undefined}:undefined});
    if(equal(comparable(draft),comparable(existing.draft)))unchanged++;
    else {await locked.save(existing.id,existing.version,draft,actor);updated++;}
   }else{
    // Always assign a source-derived address to new records; no name/slug-based merges.
    incoming.slug=(incoming.slug.slice(0,60)||'property')+'-'+row.pageId;
    incoming.source!.sync={dataSourceId,baseline:projection(incoming),conflicts:[],missing:false,lastEditedAt:row.lastEditedAt,checkedAt:now,contentReview:true};
    records.push(await locked.create(incoming,actor));created++;
   }
  }
  for(const p of records){const source=p.draft.source;if(matched.has(p.id)||!source||seen.has(source.pageId.replaceAll('-','').toLowerCase()))continue;
   if(source.sync?.dataSourceId&&source.sync.dataSourceId!==dataSourceId)continue;
   // Legacy imports are not assumed to belong to this configured data source.
   if(!source.sync)continue;
   missing++;if(source.sync?.missing)continue;
   await locked.save(p.id,p.version,{...p.draft,source:{...source,sync:{dataSourceId,baseline:source.sync?.baseline??{},conflicts:source.sync?.conflicts??[],missing:true,lastEditedAt:source.sync?.lastEditedAt??'',checkedAt:now,contentReview:true}}},actor);
  }
  return {created,updated,unchanged,missing,skipped,conflicts,published:0};
 });
}
