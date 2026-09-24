import {readDraft,type PropertyDraft} from './schema';
export const syncedFactKeys=['state','county','country','total_acres','existing_structures'] as const;
const syncedKeys=['name','region','category','status','recordType','offeringStatus'] as const;
export function projection(p:PropertyDraft):Record<string,unknown>{return {...Object.fromEntries(syncedKeys.map(k=>[k,p[k]])),...Object.fromEntries(syncedFactKeys.map(k=>[`facts.${k}`,p.facts[k]??null]))};}
export function applySyncedField(p:PropertyDraft,field:string,value:unknown):PropertyDraft{
 if(syncedKeys.includes(field as typeof syncedKeys[number]))return readDraft({...p,[field]:value});
 const key=syncedFactKeys.find(k=>field===`facts.${k}`);if(!key)throw new Error('Unsupported sync field.');
 const facts={...p.facts};if(value===null)delete facts[key];else facts[key]=value as typeof facts[typeof key];return readDraft({...p,facts});
}
