import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {ReportActor} from './investor-reports';
const id=z.string().min(1).max(120), money=z.string().regex(/^-?\d{1,18}\.\d{2}$/), date=z.iso.date();
const row=z.object({id,source:z.string().min(1).max(500)});
export const investorImportSchema=z.object({
 sourceKey:id,filename:z.string().min(1).max(200),
 entities:z.array(row.extend({name:z.string()})),holders:z.array(row.extend({name:z.string()})),
 people:z.array(row.extend({email:z.email().nullable(),getsLogin:z.boolean(),requestedRoles:z.array(z.string()).default([])})),
 access:z.array(z.object({personId:id,holderId:id})),
 positions:z.array(row.extend({holderId:id,entityId:id,kind:z.enum(['equity','loan','reserve','manager','vendor','vendor_debt','sweat_equity']),terms:z.record(z.string(),z.unknown())})),
 loans:z.array(row.extend({positionId:id,originalPrincipal:money.nullable()})),
 events:z.array(row.extend({positionId:id,date:date.nullable(),amount:money.nullable(),classification:z.enum(['actual','scheduled','held','assumed','non_cash','internal_transfer']),economicEventKey:id,transferGroup:id.nullable()})),
}).strict();
/** Explicit normalized JSON contract. This does not infer mappings or execute imports. */
export function previewInvestorImport(input:unknown,actor:ReportActor){
 if(!actor?.admin)throw new Error('Admin access required.');
 const data=investorImportSchema.parse(input),errors:string[]=[],warnings:string[]=[];
 for(const [name,rows] of Object.entries({entities:data.entities,holders:data.holders,people:data.people,positions:data.positions,loans:data.loans,events:data.events})){
  const seen=new Set<string>();for(const r of rows){if(seen.has(r.id))errors.push(`Duplicate ${name} ID: ${r.id}`);seen.add(r.id);}
 }
 const people=new Map(data.people.map(r=>[r.id,r])),holders=new Set(data.holders.map(r=>r.id)),entities=new Set(data.entities.map(r=>r.id)),positions=new Set(data.positions.map(r=>r.id));
 const links=new Set<string>();
 for(const a of data.access){
  const key=`${a.personId}/${a.holderId}`;if(links.has(key))errors.push(`Duplicate access link: ${key}`);links.add(key);
  const person=people.get(a.personId);
  if(!person||!holders.has(a.holderId))errors.push(`Unresolved access link: ${key}`);
  if(person&&!person.getsLogin)errors.push(`Access requested for gets_login=no: ${a.personId}`);
  if(person&&!person.email)warnings.push(`Identity mapping missing: ${a.personId}; access remains denied.`);
 }
 for(const p of data.positions){if(!holders.has(p.holderId)||!entities.has(p.entityId))errors.push(`Unresolved position relationships: ${p.id}`);}
 for(const r of [...data.loans,...data.events])if(!positions.has(r.positionId))errors.push(`Unresolved position: ${r.id}`);
 const events=new Map<string,string[]>();for(const e of data.events){const ids=events.get(e.economicEventKey)??[];ids.push(e.id);events.set(e.economicEventKey,ids);}
 for(const [key,ids] of events)if(ids.length>1)warnings.push(`Equivalent economic event ${key}: ${ids.join(', ')}. Do not double count.`);
 for(const p of data.people)if(p.requestedRoles.length)warnings.push(`Source roles for ${p.id} are untrusted metadata; no privileges granted.`);
 for(const e of data.events)if(e.classification!=='actual')warnings.push(`${e.id}: ${e.classification}; excluded from external cash-paid totals.`);
 return {valid:!errors.length,sourceKey:data.sourceKey,sha256:createHash('sha256').update(JSON.stringify(data)).digest('hex'),counts:{holders:data.holders.length,people:data.people.length,access:data.access.length,entities:data.entities.length,positions:data.positions.length,loans:data.loans.length,events:data.events.length},errors,warnings:[...new Set(warnings)],writesPerformed:0,accessGrantsPerformed:0};
}
// Excel 1900-date-system input, explicit system only; reject fictitious leap day.
export function excelDateOnly(serial:number){
 if(!Number.isInteger(serial)||serial<1||serial===60||serial>2958465)throw new Error('Invalid Excel date');
 return new Date(Date.UTC(1899,11,31)+(serial-(serial>60?1:0))*86400000).toISOString().slice(0,10);
}
