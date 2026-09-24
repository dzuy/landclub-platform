import {mapNotionProperty,mergeNotionDraft} from './notion-property-import';
import {readDraft} from './schema';
import type {PropertyRepository} from './repository';
import seeds from './seed-properties.json';
export async function importPropertyRecords(repo:PropertyRepository,rows:unknown[],actor:string,apply=true){
 const records=await repo.list();let created=0,updated=0,skipped=0;const conflicts:string[]=[];
 for(const row of rows){const incoming=mapNotionProperty(row);if(records.some(p=>p.draft.source?.pageId===incoming.source?.pageId)){skipped++;continue;}
 const existing=records.find(p=>p.draft.slug===incoming.slug);
 if(existing){
  if(existing.draft.source){conflicts.push(incoming.name);continue;}
  const seed=seeds.find(s=>s.slug===existing.draft.slug);
  const untouched=seed&&JSON.stringify(readDraft(seed))===JSON.stringify(existing.draft);
  const draft=untouched?{...incoming,hero:existing.draft.hero,imageAlt:existing.draft.imageAlt,gallery:existing.draft.gallery}:mergeNotionDraft(existing.draft,incoming);
  draft.source!.reviewNotes.push(untouched?'Unedited demo narrative replaced; labeled regional/reference images retained. Published version unchanged.':'Existing app content preserved. Review legacy narrative against imported facts before publishing.');
  if(apply){const saved=await repo.save(existing.id,existing.version,draft,actor);records[records.findIndex(r=>r.id===saved.id)]=saved;}updated++;
 }else{if(apply)records.push(await repo.create(incoming,actor));created++;}
 }
 return {created,updated,skipped,conflicts,published:0};
}
