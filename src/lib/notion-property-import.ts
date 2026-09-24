import {z} from 'zod';
import {readDraft,type PropertyDraft} from './schema';
import type {PropertyFacts,PropertyFact} from './property-facts';
export const notionRowSchema=z.object({pageId:z.string().regex(/^[a-f0-9]{32}$/),url:z.url(),name:z.string().min(1),location:z.string(),acreage:z.string(),status:z.array(z.string()),tags:z.array(z.string()),existingStructures:z.array(z.string())});
const actual=(value:PropertyFact['value'],notes?:string):PropertyFact=>({state:'Actual',value,notes});
const unknown=(notes?:string):PropertyFact=>({state:'Not yet determined',value:null,notes});
export function mapNotionProperty(input:unknown,importedAt=new Date().toISOString()):PropertyDraft{
 const r=notionRowSchema.parse(input),facts:PropertyFacts={};
 const county=r.location.match(/([^,—]+?) County/);if(county)facts.county=actual(county[1].trim());
 if(/\bCA\b/.test(r.location)){facts.state=actual('California');facts.country=actual('United States');}
 if(/\bNC\b/.test(r.location)){facts.state=actual('North Carolina');facts.country=actual('United States');}
 if(/Italy|\bIT\b/.test(r.location))facts.country=actual('Italy');
 if(/Mexico/.test(r.location))facts.country=actual('Mexico');
 if(r.acreage){const exact=r.acreage.match(/^(\d+(?:\.\d+)?) acres?$/);facts.total_acres=exact?actual(Number(exact[1]),'As recorded in Notion.'):unknown(r.acreage);}
 if(r.existingStructures.length)facts.existing_structures=actual(r.existingStructures.join(', '),'As recorded in Notion.');
 const category=r.tags.includes('Ocean')?'Coast':r.tags.includes('Mountain')?'Mountains':r.tags.includes('Farm')?'Farms':r.tags.includes('Desert')?'Desert':'Unclassified';
 const isArea=r.tags.includes('Needs Scouting')||r.name.includes('(concept)');
 const notes=['Initial import of Notion property fields. Review missing facts, classification and imagery before publication.'];
 if(r.status.includes('Inactive')||r.status.includes('Pass'))notes.push('Inactive or passed in Notion. Retained as a private draft; publication requires an explicit status decision.');
 const p=readDraft({name:r.name,slug:r.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),region:r.location||'Location not yet determined',category,status:r.status.join(' / ')||'Unclassified',recordType:isArea?'scouting-area':'property',offeringStatus:r.status.includes('Sold')?'Past Project':isArea?'Scouting':null,headline:r.name,summary:`${r.name}${r.location?` · ${r.location}`:''}.`,intro:`${r.name}${r.location?` is located in ${r.location}`:''}. Property details are being prepared from the Notion record.`,hero:'',imageAlt:'Property image not yet supplied',isDemo:false,gallery:[],sections:[],facts,source:{system:'notion',pageId:r.pageId,url:r.url,importedAt,sourceStatus:r.status.join(' / '),reviewNotes:notes}});
 return readDraft(p);
}
export function mergeNotionDraft(existing:PropertyDraft,incoming:PropertyDraft):PropertyDraft{
 return readDraft({...existing,source:incoming.source,facts:{...incoming.facts,...existing.facts},coordinates:existing.coordinates??incoming.coordinates,proximity:existing.proximity.length?existing.proximity:incoming.proximity,phases:existing.phases.length?existing.phases:incoming.phases,media:existing.media.length?existing.media:incoming.media,offeringStatus:existing.offeringStatus??incoming.offeringStatus});
}
