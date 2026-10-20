import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database,Queryable} from './database';
import type {ReportActor} from './investor-reports';
import {calculateTerms,confirmationIssues,termsSchema,transactionSchema,type Revision,type TermTransaction} from './investment-terms';
function staff(actor:ReportActor){if(!actor?.admin)throw new Error('Admin access required.');return actor;}
export class InvestmentTermsRepository{
 constructor(private db:Database){}
 async ready(){return !!(await this.db.query<{ready:string|null}>("SELECT to_regclass('investment_term_revisions')::text AS ready")).rows[0]?.ready;}
 async memberPositions(member:string,actor:ReportActor){staff(actor);z.uuid().parse(member);return (await this.db.query<{id:string;name:string;currency:string;project_name:string;kind:string;source_id:string}>(`SELECT DISTINCT p.id,p.name,p.currency,p.project_name,p.kind,p.source_id FROM investment_positions p JOIN investor_access a ON a.holder_id=p.holder_id JOIN report_people u ON u.id=a.person_id WHERE (u.auth_user_id=$1 OR u.prepared_member_id=$1) AND u.disabled_at IS NULL AND a.revoked_at IS NULL`,[member])).rows;}
 async read(position:string,actor:ReportActor,tx:Queryable=this.db){staff(actor);return this.readState(position,tx);}
 private async readState(position:string,tx:Queryable){z.uuid().parse(position);const history=(await tx.query<Revision>('SELECT id,version,terms,confirmed,actor_id,created_at::text,review FROM investment_term_revisions WHERE position_id=$1 ORDER BY version',[position])).rows;const transactions=(await tx.query<{payload:TermTransaction}>('SELECT payload FROM investment_reviewed_transactions WHERE position_id=$1 ORDER BY created_at,id',[position])).rows.map(r=>r.payload);return {history,transactions};}
 private async previewWith(position:string,input:unknown,asOf:string,actor:ReportActor,tx:Queryable){const terms=termsSchema.parse(input),state=await this.read(position,actor,tx),version=(state.history.at(-1)?.version??0)+1;const confirmed=state.history.filter(r=>r.confirmed);if(confirmed.some(r=>r.terms.effective&&terms.effective&&r.terms.effective>=terms.effective))throw new Error('Amendments must follow the last confirmed effective date. Historical corrections require reconciliation.');const result=calculateTerms([...confirmed,{id:'preview',version,terms,confirmed:true}],state.transactions,asOf);const digest=createHash('sha256').update(JSON.stringify({position,terms,asOf,state,result})).digest('hex');return {terms,version,result,digest};}
 async preview(position:string,input:unknown,asOf:string,actor:ReportActor){staff(actor);return this.previewWith(position,input,asOf,actor,this.db);}
 async save(position:string,input:unknown,expectedVersion:number,actor:ReportActor,confirmation?:{asOf:string;digest:string}){const who=staff(actor);return this.db.transaction(async tx=>{
  if(!(await tx.query('SELECT id FROM investment_positions WHERE id=$1 FOR UPDATE',[z.uuid().parse(position)])).rows.length)throw new Error('Investment unavailable.');
  const state=await this.read(position,actor,tx);if((state.history.at(-1)?.version??0)!==expectedVersion)throw new Error('Terms changed. Reload before saving.');
  const terms=termsSchema.parse(input);if(terms.agreementId&&!(await tx.query('SELECT id FROM investment_term_agreements WHERE id=$1 AND position_id=$2',[terms.agreementId,position])).rows.length)throw new Error('Agreement belongs to another investment.');
  let review:unknown={};
  if(confirmation){const p=await this.previewWith(position,terms,confirmation.asOf,actor,tx);if(p.digest!==confirmation.digest)throw new Error('Preview changed. Review again.');const issues=confirmationIssues(terms);if(issues.length)throw new Error(issues.join('; '));review={asOf:confirmation.asOf,digest:p.digest,result:p.result,transactionCount:state.transactions.length};}
  const id=randomUUID();await tx.query('INSERT INTO investment_term_revisions(id,position_id,version,terms,confirmed,actor_id,review) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,position,expectedVersion+1,JSON.stringify(terms),!!confirmation,who.id,JSON.stringify(review)]);return id;
 });}
 async transaction(position:string,input:unknown,actor:ReportActor){const who=staff(actor),event=transactionSchema.parse(input);await this.db.transaction(async tx=>{await tx.query('SELECT id FROM investment_positions WHERE id=$1 FOR UPDATE',[z.uuid().parse(position)]);if(event.sourceEventId&&!(await tx.query('SELECT id FROM investment_events WHERE id=$1 AND position_id=$2',[event.sourceEventId,position])).rows.length)throw new Error('Source transaction belongs to another investment.');await tx.query('INSERT INTO investment_reviewed_transactions(id,position_id,payload,actor_id) VALUES($1,$2,$3,$4)',[randomUUID(),position,JSON.stringify(event),who.id]);});}
 async attach(position:string,filename:string,bytes:Uint8Array,actor:ReportActor){const who=staff(actor);z.uuid().parse(position);if(bytes.length>1024*1024||!Buffer.from(bytes).subarray(0,5).equals(Buffer.from('%PDF-')))throw new Error('Use a PDF up to 1 MiB.');const id=randomUUID();await this.db.query('INSERT INTO investment_term_agreements(id,position_id,filename,content,sha256,actor_id) VALUES($1,$2,$3,$4,$5,$6)',[id,position,z.string().min(1).max(200).parse(filename),bytes,createHash('sha256').update(bytes).digest('hex'),who.id]);return id;}
 async agreements(position:string,actor:ReportActor){staff(actor);return (await this.db.query<{id:string;filename:string;sha256:string}>('SELECT id,filename,sha256 FROM investment_term_agreements WHERE position_id=$1',[z.uuid().parse(position)])).rows;}
 async download(id:string,actor:ReportActor){staff(actor);return (await this.db.query<{filename:string;content:Uint8Array}>('SELECT filename,content FROM investment_term_agreements WHERE id=$1',[z.uuid().parse(id)])).rows[0];}
 async forReport(report:string,asOf:string,actor:ReportActor){return this.authorizedCalculation(report,asOf,actor);}
 async forPreview(report:string,asOf:string,token:string,actor:ReportActor){
  if(!actor?.admin||!/^([a-f0-9]{64})$/.test(token))return null;
  return this.authorizedCalculation(report,asOf,actor,token);
 }
 private async authorizedCalculation(report:string,asOf:string,actor:ReportActor,previewToken?:string){
  if(!actor||!z.uuid().safeParse(report).success||(!previewToken&&!z.uuid().safeParse(actor.id).success))return null;
  const previewJoin=previewToken?'JOIN investor_preview_sessions session ON session.person_id=u.id':'';
  const predicate=previewToken?"session.token_hash=$2 AND session.admin_id=$3 AND session.ended_at IS NULL AND session.expires_at>now() AND (session.mode='draft' OR (r.released_at IS NOT NULL AND r.review_state='reviewed'))":"r.released_at IS NOT NULL AND r.review_state='reviewed' AND u.auth_user_id=$2::uuid";
  const params=previewToken?[report,createHash('sha256').update(previewToken).digest('hex'),actor.id]:[report,actor.id];
  const sql=`SELECT r.position_id FROM investor_reports r JOIN investment_positions p ON p.id=r.position_id JOIN investor_access a ON a.holder_id=p.holder_id JOIN report_people u ON u.id=a.person_id ${previewJoin} WHERE r.id=$1 AND a.revoked_at IS NULL AND u.disabled_at IS NULL AND ${predicate}`;
  return this.db.transaction(async tx=>{
   const allowed=await tx.query<{position_id:string}>(sql,params);if(!allowed.rows.length)return null;
   if(!(await tx.query<{ready:string|null}>("SELECT to_regclass('investment_term_revisions')::text AS ready")).rows[0]?.ready)return {available:false as const,reason:'Reviewed terms are not configured.'};
   const state=await this.readState(allowed.rows[0].position_id,tx);
   let result:ReturnType<typeof calculateTerms>;try{result=calculateTerms(state.history,state.transactions,asOf);}catch{result={available:false,reason:'Recorded transactions require reconciliation before accrual can be calculated.'};}
   return (await tx.query(sql,params)).rows.length?result:null;
  });
 }
}
