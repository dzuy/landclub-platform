import type {PropertyRecord} from './schema';
import {normalizeId} from './notion-platform';

// A retired ID remains owned by the survivor, but is no longer a content source.
export function notionIdentityOwners(records:PropertyRecord[]){
 const owners=new Map<string,PropertyRecord>();
 for(const record of records){
  const source=record.draft.source;if(!source)continue;
  for(const raw of [source.pageId,...source.retiredPageIds??[]]){
   const id=normalizeId(raw),owner=owners.get(id);
   if(owner&&owner.id!==record.id)throw new Error('Ambiguous Notion identity mapping; no records changed.');
   owners.set(id,record);
  }
 }
 return owners;
}
