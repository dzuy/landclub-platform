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
 const remote=projection(incoming),current=projection(local);let draft=local;
 const conflicts:NonNullable<NonNullable<PropertyDraft['source']>['sync']>['conflicts']=[];
 for(const [field,next] of Object.entries(remote)){
  const known=Object.hasOwn(baseline,field),base=baseline[field],ours=current[field];
  if(equal(ours,next)){baseline[field]=next;continue;}
  if(known&&equal(next,base))continue;
  if(known&&equal(ours,base)){draft=applySyncedField(draft,field,next);baseline[field]=next;}
  else conflicts.push({field,notion:next});
 }
 // Keep unresolved conflicts until resolved, including across identical subsequent syncs.
 for(const c of previous?.conflicts??[])if(!conflicts.some(v=>v.field===c.field)&&!equal(current[c.field],remote[c.field])&&equal(remote[c.field],c.notion))conflicts.push(c);
 const contentReview=previous?.contentReview===true||Boolean(previous&&previous.lastEditedAt!==lastEditedAt)||!previous;
 return readDraft({...draft,source:{...local.source!,sourceStatus:incoming.source!.sourceStatus,sync:{dataSourceId,baseline,conflicts,missing:false,lastEditedAt,checkedAt:now,contentReview}}});
}
export async function syncNotionRecords(repo:PropertyRepository,rows:LiveNotionRow[],dataSourceId:string,actor:string){
 // Serialize imports and concurrent app writes; failures roll back the entire run.
 return repo.locked(async locked=>{
  const records=await locked.list(),seen=new Set(rows.map(r=>r.pageId));
  let created=0,updated=0,unchanged=0,missing=0;const conflicts:string[]=[];const now=new Date().toISOString();
  for(const row of rows){
   const incoming=mapNotionProperty(row,now);
   const existing=records.find(p=>p.draft.source?.pageId.replaceAll('-','').toLowerCase()===row.pageId);
   if(existing){
    if(existing.draft.source?.sync&&existing.draft.source.sync.dataSourceId!==dataSourceId)throw new Error('Property is already linked to another Notion data source.');
    const draft=mergeLiveProperty(existing.draft,incoming,dataSourceId,row.lastEditedAt,now);
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
  for(const p of records){const source=p.draft.source;if(!source||seen.has(source.pageId.replaceAll('-','').toLowerCase()))continue;
   if(source.sync?.dataSourceId&&source.sync.dataSourceId!==dataSourceId)continue;
   // Legacy imports are not assumed to belong to this configured data source.
   if(!source.sync)continue;
   missing++;if(source.sync?.missing)continue;
   await locked.save(p.id,p.version,{...p.draft,source:{...source,sync:{dataSourceId,baseline:source.sync?.baseline??{},conflicts:source.sync?.conflicts??[],missing:true,lastEditedAt:source.sync?.lastEditedAt??'',checkedAt:now,contentReview:true}}},actor);
  }
  return {created,updated,unchanged,missing,conflicts,published:0};
 });
}
