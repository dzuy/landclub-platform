import {nordenCompanyReport} from './investor-company-report';
import {z} from 'zod';
import type {Database} from './database';

export type ReportActor={id:string;admin:boolean}|null;
export type ReportSummary={id:string;title:string;as_of:string|null;review_state:'draft'|'reviewed';released_at:string|null;project_name:string;position_name:string;kind:'equity'|'loan'|'reserve'|'manager'|'vendor'|'vendor_debt'|'sweat_equity';currency:string;holder_name:string};
export type ReportLine={id:string;section:'summary'|'spending'|'position'|'transactions';label:string;amount:string|null;basis:'actual'|'projection'|'missing'|'reported'|'internal_transfer'|'non_cash'|'assumed'|'held';source_reference:string;effective_date:string|null};
export type ReportSchedule={id:string;label:string;scheduled_date:string|null;confirmation:'pending'|'confirmed';source_reference:string;note:string};
export type ReportFinding={id:string;source_reference:string;description:string;source_value:string|null;comparison_value:string|null;status:'pending'|'resolved';resolution:string|null};
export type InvestorReport=ReportSummary & {narrative:string|null;source_reference:string;lines:ReportLine[];schedules:ReportSchedule[];findings:ReportFinding[];documents:{id:string;filename:string}[]};
const joins='FROM investor_reports r JOIN investment_positions p ON p.id=r.position_id JOIN investment_holders h ON h.id=p.holder_id';
// Actor comes only from server authentication. Never infer grants from emails, roles,
// property membership or member_investments. Every child query repeats this predicate.
const allowed=`($1::boolean OR (r.released_at IS NOT NULL AND EXISTS (
 SELECT 1 FROM investor_access a JOIN report_people person ON person.id=a.person_id
 WHERE a.holder_id=p.holder_id AND a.revoked_at IS NULL AND person.disabled_at IS NULL
 AND person.auth_user_id=$2::uuid)))`;
const fields=`r.id,r.title,r.as_of::text,r.review_state,r.released_at::text,p.project_name,p.name AS position_name,p.kind,p.currency,h.name AS holder_name`;
function identity(actor:ReportActor):[boolean,string|null]|null{
 if(!actor)return null;
 if(actor.admin)return [true,null];
 return z.uuid().safeParse(actor.id).success?[false,actor.id]:null;
}
export class InvestorReportRepository{
 constructor(private db:Database,private scope:{person:boolean;draft:boolean;subjectId?:string}={person:false,draft:false}){}
 private identity(actor:ReportActor){return this.scope.subjectId?identity(actor?{id:this.scope.subjectId,admin:false}:null):identity(actor);}
 private get predicate(){return this.scope.person?allowed.replace('person.auth_user_id=$2::uuid','person.id=$2::uuid').replace('r.released_at IS NOT NULL',this.scope.draft?'TRUE':'r.released_at IS NOT NULL'):allowed;}
 async isReady(){
  const result=await this.db.query<{ready:boolean}>(`SELECT bool_and(to_regclass(name) IS NOT NULL) AS ready FROM unnest($1::text[]) AS names(name)`,[['investor_reports','investment_positions','investment_holders','investor_access','report_people','investor_report_lines','investor_report_schedules','investor_report_findings','investor_report_documents']]);
  return result.rows[0]?.ready===true;
 }
 async list(actor:ReportActor):Promise<ReportSummary[]>{
  const params=this.identity(actor);if(!params)return [];
  return (await this.db.query<ReportSummary>(`SELECT ${fields} ${joins} WHERE ${this.predicate} ORDER BY r.as_of DESC NULLS LAST,r.id`,params)).rows;
 }
 async get(id:string,actor:ReportActor):Promise<InvestorReport|null>{
  const who=this.identity(actor);if(!who||!z.uuid().safeParse(id).success)return null;
  const params=[...who,id];
  const report=(await this.db.query<InvestorReport>(`SELECT ${fields},r.narrative,r.source_reference ${joins} WHERE ${this.predicate} AND r.id=$3::uuid`,params)).rows[0];
  if(!report)return null;
  const child=`${joins} WHERE ${this.predicate} AND r.id=$3::uuid`;
  const lines=(await this.db.query<ReportLine>(`SELECT l.id,l.section,l.label,l.amount::text,l.basis,l.source_reference,l.effective_date::text FROM investor_report_lines l WHERE l.report_id IN (SELECT r.id ${child}) ORDER BY l.ordinal,l.id`,params)).rows;
  const schedules=(await this.db.query<ReportSchedule>(`SELECT s.id,s.label,s.scheduled_date::text,s.confirmation,s.source_reference,s.note FROM investor_report_schedules s WHERE s.report_id IN (SELECT r.id ${child}) ORDER BY s.source_reference,s.scheduled_date,s.id`,params)).rows;
  const documents=(await this.db.query<{id:string;filename:string}>(`SELECT d.id,d.filename FROM investor_report_documents d WHERE d.report_id IN (SELECT r.id ${child}) ORDER BY d.filename,d.id`,params)).rows;
  const findings=(await this.db.query<ReportFinding>(`SELECT f.id,f.source_reference,f.description,f.source_value,f.comparison_value,f.status,f.resolution FROM investor_report_findings f WHERE f.report_id IN (SELECT r.id ${child}) ORDER BY f.id`,params)).rows;
  // Recheck after child loads: a revocation during loading fails closed.
  if(!(await this.db.query(`SELECT r.id ${child}`,params)).rows.length)return null;
  return {...report,lines,schedules,documents,findings};
 }
 async company(id:string,actor:ReportActor){
  const who=this.identity(actor);if(!who||!z.uuid().safeParse(id).success)return null;
  const result=await this.db.query<{payload:unknown}>(`SELECT snapshot.payload ${joins} JOIN investment_entities entity ON entity.id=p.entity_id JOIN investor_source_snapshots snapshot ON snapshot.id=r.snapshot_id WHERE ${this.predicate} AND r.id=$3::uuid AND entity.source_id='ENT-NC'`,[...who,id]);
  if(!result.rows[0])return null;
  const company=nordenCompanyReport(result.rows[0].payload);
  // Re-check access after reading and mapping the immutable source snapshot.
  if(!await this.get(id,actor))return null;
  return company;
 }
 async download(id:string,actor:ReportActor){
  const who=this.identity(actor);if(!who||!z.uuid().safeParse(id).success)return null;
  return (await this.db.query<{filename:string;content:Uint8Array}>(`SELECT d.filename,d.content FROM investor_report_documents d WHERE d.id=$3::uuid AND d.report_id IN (SELECT r.id ${joins} WHERE ${this.predicate})`,[...who,id])).rows[0]??null;
 }
}
// Preserve decimal precision; null must never be formatted as zero.
export function reportAmount(amount:string|null,currency:string){
 if(amount===null)return 'Not supplied';
 const [whole,fraction='00']=amount.split('.');
 return `${currency} ${whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')}.${fraction.padEnd(2,'0')}`;
}
