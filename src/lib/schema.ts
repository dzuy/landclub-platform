import { z } from 'zod';
const text=(max:number)=>z.string().trim().max(max);
const imagePath=z.string().regex(/^\/images\/[a-zA-Z0-9._-]+$/, 'Choose an image from the library.');
export const draftSchema=z.object({
 name:text(120).min(1,'A property name is required.'),slug:text(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/,'Use lowercase words separated by hyphens.'),
 region:text(160).min(1),category:z.enum(['Mountains','Farms','Coast','Desert']),status:text(120).min(1),
 headline:text(200).min(1),summary:text(1200).min(1),intro:text(6000).min(1),hero:imagePath,imageAlt:text(250).min(1),isDemo:z.boolean(),
 gallery:z.array(z.object({src:imagePath,alt:text(250).min(1),caption:text(500),type:z.enum(['Regional','Inspiration','Current property','Proposed'])})).max(20),
 sections:z.array(z.object({id:z.string().regex(/^[a-z0-9-]+$/).max(80),eyebrow:text(120),title:text(200).min(1),body:text(12000),facts:z.array(z.object({label:text(160).min(1),value:text(2000).min(1)})).max(40)})).max(30)
}).superRefine((data,ctx)=>{if(new Set(data.sections.map(s=>s.id)).size!==data.sections.length)ctx.addIssue({code:'custom',message:'Section identifiers must be unique.',path:['sections']});});
export type PropertyDraft=z.infer<typeof draftSchema>;
export type PropertyRecord={id:string;draft:PropertyDraft;published:PropertyDraft|null;version:number;published_at:string|null;updated_at:string};
export const imageLibrary=[{src:'/images/landscape.png',label:'Donner Lake · regional'},{src:'/images/cabin.jpg',label:'Forest cabin · inspiration'},{src:'/images/interior.jpg',label:'Timber interior · inspiration'},{src:'/images/coast.jpg',label:'Point Reyes · regional'},{src:'/images/farm.jpg',label:'Salinas farmland · regional'},{src:'/images/desert.jpg',label:'Joshua Tree · regional'}];
