import { z } from 'zod';
import {categories,offeringStatuses,factsSchema,coordinatesSchema,proximitySchema,phaseSchema,mediaSchema,assetUrl} from './property-facts';
const text=(max:number)=>z.string().trim().max(max);
const imagePath=assetUrl;
export const draftSchema=z.object({
 schemaVersion:z.literal(2).default(2),recordType:z.enum(['property','scouting-area']).default('property'),offeringStatus:z.enum(offeringStatuses).nullable().default(null),
 facts:factsSchema.default({}),coordinates:coordinatesSchema.nullable().default(null),proximity:z.array(proximitySchema).default([]),phases:z.array(phaseSchema).default([]),media:z.array(mediaSchema).default([]),currency:z.enum(['USD','CAD','MXN','EUR','GBP','CRC']).default('USD'),
 source:z.object({system:z.literal('notion'),pageId:z.string(),url:z.url(),importedAt:z.iso.datetime(),sourceStatus:text(500),sync:z.object({dataSourceId:z.string(),baseline:z.record(z.string(),z.unknown()),conflicts:z.array(z.object({field:z.string(),notion:z.unknown()})),missing:z.boolean(),lastEditedAt:z.string(),checkedAt:z.string(),contentReview:z.boolean()}).optional(),reviewNotes:z.array(text(2000)).default([])}).optional(),
 name:text(120),slug:text(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/,'Use lowercase words separated by hyphens.'),
 region:text(160),category:z.enum(categories),status:text(120),
 headline:text(200),summary:text(1200),intro:text(6000),hero:z.union([imagePath,z.literal('')]),imageAlt:text(250),isDemo:z.boolean(),
 gallery:z.array(z.object({src:imagePath,alt:text(250).min(1),caption:text(500),type:z.enum(['Regional','Inspiration','Current property','Proposed'])})).max(20),
 sections:z.array(z.object({id:z.string().regex(/^[a-z0-9-]+$/).max(80),eyebrow:text(120),title:text(200).min(1),body:text(12000),facts:z.array(z.object({label:text(160).min(1),value:text(2000).min(1)})).max(40)})).max(30)
}).superRefine((data,ctx)=>{if(new Set(data.sections.map(s=>s.id)).size!==data.sections.length)ctx.addIssue({code:'custom',message:'Section identifiers must be unique.',path:['sections']});});
export type PropertyDraft=z.infer<typeof draftSchema>;
export type PropertyRecord={id:string;draft:PropertyDraft;published:PropertyDraft|null;version:number;published_at:string|null;updated_at:string};
export const imageLibrary=[{src:'/images/landscape.png',label:'Donner Lake · regional'},{src:'/images/cabin.jpg',label:'Forest cabin · inspiration'},{src:'/images/interior.jpg',label:'Timber interior · inspiration'},{src:'/images/coast.jpg',label:'Point Reyes · regional'},{src:'/images/farm.jpg',label:'Salinas farmland · regional'},{src:'/images/desert.jpg',label:'Joshua Tree · regional'}];

// Publishing permits incomplete content while the product is being developed.
// Retain structural validation (URLs, types and stable page addresses).
export const publicationSchema=draftSchema;
export function propertyStatus(p:PropertyDraft){return p.offeringStatus||p.status||'Details coming soon';}
export function propertyDisplay(p:PropertyDraft):PropertyDraft{
 const name=p.name.trim()||'Untitled property';
 return {...p,name,headline:p.headline.trim()||name,
  summary:p.summary.trim()&&p.summary!=='Add a description before publishing.'?p.summary:'Details coming soon.',
  intro:p.intro.trim()&&p.intro!=='Tell the story of this property.'?p.intro:'More information about this property will be added soon.',
  region:p.region.trim()||'Location to be confirmed',imageAlt:p.imageAlt.trim()||name};
}

export function readDraft(input:unknown):PropertyDraft{
 const p=input as Record<string,unknown>;
 const legacy:Record<string,string>={'Development vision · sample brochure':'Coming Soon','Completed-home example':'Coming Soon','Scouting area':'Scouting','Past project · draft record':'Past Project','Past chapter / scouting continues':'Scouting','Realized':'Past Project'};
 return draftSchema.parse({...p,...(!('offeringStatus' in p)&&legacy[String(p.status)]?{offeringStatus:legacy[String(p.status)],recordType:String(p.status).includes('Scouting')||String(p.status).includes('scouting')?'scouting-area':'property'}:{})});
}
