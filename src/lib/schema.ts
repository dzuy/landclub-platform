import { z } from 'zod';
import {categories,offeringStatuses,factsSchema,coordinatesSchema,proximitySchema,phaseSchema,mediaSchema,assetUrl} from './property-facts';
const text=(max:number)=>z.string().trim().max(max);
const imagePath=assetUrl;
export const draftSchema=z.object({
 schemaVersion:z.literal(2).default(2),recordType:z.enum(['property','scouting-area']).default('property'),offeringStatus:z.enum(offeringStatuses).nullable().default(null),
 facts:factsSchema.default({}),coordinates:coordinatesSchema.nullable().default(null),proximity:z.array(proximitySchema).default([]),phases:z.array(phaseSchema).default([]),media:z.array(mediaSchema).default([]),currency:z.enum(['USD','CAD','MXN','EUR','GBP','CRC']).default('USD'),
 source:z.object({system:z.literal('notion'),pageId:z.string(),url:z.url(),importedAt:z.iso.datetime(),sourceStatus:text(500),sync:z.object({dataSourceId:z.string(),baseline:z.record(z.string(),z.unknown()),conflicts:z.array(z.object({field:z.string(),notion:z.unknown()})),missing:z.boolean(),lastEditedAt:z.string(),checkedAt:z.string(),contentReview:z.boolean()}).optional(),reviewNotes:z.array(text(2000)).default([])}).optional(),
 name:text(120).min(1,'A property name is required.'),slug:text(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/,'Use lowercase words separated by hyphens.'),
 region:text(160).min(1),category:z.enum(categories),status:text(120).min(1),
 headline:text(200).min(1),summary:text(1200).min(1),intro:text(6000).min(1),hero:z.union([imagePath,z.literal('')]),imageAlt:text(250).min(1),isDemo:z.boolean(),
 gallery:z.array(z.object({src:imagePath,alt:text(250).min(1),caption:text(500),type:z.enum(['Regional','Inspiration','Current property','Proposed'])})).max(20),
 sections:z.array(z.object({id:z.string().regex(/^[a-z0-9-]+$/).max(80),eyebrow:text(120),title:text(200).min(1),body:text(12000),facts:z.array(z.object({label:text(160).min(1),value:text(2000).min(1)})).max(40)})).max(30)
}).superRefine((data,ctx)=>{if(new Set(data.sections.map(s=>s.id)).size!==data.sections.length)ctx.addIssue({code:'custom',message:'Section identifiers must be unique.',path:['sections']});});
export type PropertyDraft=z.infer<typeof draftSchema>;
export type PropertyRecord={id:string;draft:PropertyDraft;published:PropertyDraft|null;version:number;published_at:string|null;updated_at:string};
export const imageLibrary=[{src:'/images/landscape.png',label:'Donner Lake · regional'},{src:'/images/cabin.jpg',label:'Forest cabin · inspiration'},{src:'/images/interior.jpg',label:'Timber interior · inspiration'},{src:'/images/coast.jpg',label:'Point Reyes · regional'},{src:'/images/farm.jpg',label:'Salinas farmland · regional'},{src:'/images/desert.jpg',label:'Joshua Tree · regional'}];

export function publicationIssues(p:PropertyDraft):string[]{
 const issues:string[]=[];
 if(!p.offeringStatus)issues.push('Choose an offering status.');
 if(p.category==='Unclassified')issues.push('Choose a landscape category.');
 if(!p.hero)issues.push('Add a hero image.');
 if(p.name==='Untitled property'||p.summary==='Add a description before publishing.')issues.push('Replace placeholder property content.');
 if(p.recordType==='scouting-area'&&p.offeringStatus!=='Scouting')issues.push('Scouting areas must use Scouting status.');
 if(p.offeringStatus==='Available'){
  if(p.recordType!=='property')issues.push('Available listings must identify a specific property.');
  for(const key of ['county','total_acres','elevation','topography','road_access','development_stage','shares_available','share_price'] as const){const f=p.facts[key];if(!f||f.value===null||f.value===''||f.state==='Not yet determined')issues.push(`Complete ${key.replaceAll('_',' ')} before publishing an Available property.`);}
  for(const kind of ['airport','town'])if(!p.proximity.some(v=>v.kind===kind&&v.minutes.state!=='Not yet determined'&&v.minutes.value!==null))issues.push(`Add a nearby ${kind} with a known travel time.`);
 }
 const total=p.facts.total_shares?.value,available=p.facts.shares_available?.value;
 if(typeof total==='number'&&typeof available==='number'&&available>total)issues.push('Available shares cannot exceed total shares.');
 return issues;
}
export const publicationSchema=draftSchema.superRefine((p,c)=>{for(const message of publicationIssues(p))c.addIssue({code:'custom',message});});
export function propertyStatus(p:PropertyDraft){return p.offeringStatus??p.status;}

export function readDraft(input:unknown):PropertyDraft{
 const p=input as Record<string,unknown>;
 const legacy:Record<string,string>={'Development vision · sample brochure':'Coming Soon','Completed-home example':'Coming Soon','Scouting area':'Scouting','Past project · draft record':'Past Project','Past chapter / scouting continues':'Scouting','Realized':'Past Project'};
 return draftSchema.parse({...p,...(!('offeringStatus' in p)&&legacy[String(p.status)]?{offeringStatus:legacy[String(p.status)],recordType:String(p.status).includes('Scouting')||String(p.status).includes('scouting')?'scouting-area':'property'}:{})});
}
