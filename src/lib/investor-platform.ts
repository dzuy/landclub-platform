import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database,Queryable} from './database';
import {InvestorReportRepository,type ReportActor,type InvestorReport} from './investor-reports';
import {sourceWorkbooksSchema,sourceReviewReports,sourceMoney,type SourceWorkbooks} from './investor-source-review';
export type PlatformActor={id:string;admin:boolean};
export type PreparedInvestor={id:string;source_id:string;display_name:string;auth_user_id:string|null;prepared_member_id?:string|null;disabled_at:string|null};
export function stableInvestorId(key:string){const hex=createHash('sha256').update(`land-club-investor:${key}`).digest('hex');return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;}
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
function admin(actor:ReportActor):asserts actor is PlatformActor{if(!actor?.admin)throw new Error('Admin access required.');}
async function audit(db:Queryable,actor:PlatformActor,action:string,resource:string|null,person:string|null=null){await db.query('INSERT INTO investor_operations_audit(id,actor_id,person_id,action,resource_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),actor.id,person,action,resource]);}
const targets=[{source:'PER-001',holder:'INV-001',name:'Ian Kenny'},{source:'PER-007',holder:'INV-005',name:'Scott Jeeves'}];
const positionIds=new Set(['POS-001','POS-006','POS-101','POS-102']);
function tabRows(books:SourceWorkbooks,name:string):Array<Record<string,string|null> & {source:string}>{return books.flatMap(b=>b.tabs.filter(t=>t.name===name).flatMap(t=>t.rows.map(r=>({...r,source:b.filename}))));}
export function preparePlatformImport(input:unknown){
 const books=sourceWorkbooksSchema.parse(input),reports=sourceReviewReports(books).filter(r=>positionIds.has(r.id));
 if(reports.length!==4)throw new Error('Expected Ian and Scott’s four source positions.');
 const people=tabRows(books,'people'),access=tabRows(books,'investor_access');
 for(const target of targets)if(!people.some(p=>p.person_id===target.source)||!access.some(a=>a.person_id===target.source&&a.investor_id===target.holder))throw new Error('Missing explicit source identity relationships.');
 return {books,reports,digest:digest(JSON.stringify(books)),people:targets,positions:4,warnings:['Draft source balances, not verified or current balances.','No login accounts or invitations created.','New versions create new draft reports; existing releases and statements are preserved.','Financial access is prepared only for Ian and Scott; workbook admin roles are never imported.']};
}
export class InvestorPlatformRepository{
 constructor(public db:Database){}
 async ready(){return !!(await this.db.query<{ready:boolean}>("SELECT to_regclass('investor_preview_sessions') IS NOT NULL AS ready")).rows[0]?.ready;}
 async people(actor:ReportActor){admin(actor);return (await this.db.query<PreparedInvestor>('SELECT id,source_id,display_name,auth_user_id,disabled_at::text FROM report_people ORDER BY display_name')).rows;}
 async import(input:unknown,actor:ReportActor){
  admin(actor);const plan=preparePlatformImport(input),batch=stableInvestorId(plan.digest),snapshot=stableInvestorId(`snapshot:${plan.digest}`);
  return this.db.transaction(async tx=>{
   // One source batch at a time, including concurrent submissions.
   await tx.query('LOCK TABLE investor_import_batches IN EXCLUSIVE MODE');
   if((await tx.query('SELECT id FROM investor_import_batches WHERE digest=$1',[plan.digest])).rows.length)return {imported:false,digest:plan.digest};
   await tx.query('INSERT INTO investor_source_snapshots(id,source_key,sha256,source_filename,payload) VALUES($1,$2,$3,$4,$5)',[snapshot,'nathan-2026-10-16',plan.digest,'Normalized four-workbook evidence',JSON.stringify(plan.books)]);
   const positions=tabRows(plan.books,'positions'),entities=tabRows(plan.books,'entities'),loans=tabRows(plan.books,'loans');
   for(const report of plan.reports){
    const raw=positions.find(p=>p.position_id===report.id)!,holder=stableInvestorId(raw.investor_id!),entity=stableInvestorId(raw.entity_id!),position=stableInvestorId(report.id),rid=stableInvestorId(`${plan.digest}:${report.id}`),loan=loans.find(l=>l.position_id===report.id);
    await tx.query('INSERT INTO investment_holders(id,source_id,name) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[holder,raw.investor_id,report.holder_name]);
    await tx.query('INSERT INTO investment_entities(id,source_id,name) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[entity,raw.entity_id,entities.find(e=>e.entity_id===raw.entity_id)?.entity_name??report.project_name]);
    await tx.query('INSERT INTO investment_positions(id,source_id,holder_id,entity_id,project_name,name,kind,currency,source_details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING',[position,report.id,holder,entity,report.project_name,report.position_name,report.kind,report.currency,JSON.stringify({position:raw,loan:loan??null})]);
    await tx.query('INSERT INTO investment_position_terms(position_id,snapshot_id,commitment_amount,original_principal,entitlement,pref_rate,ownership_percent,profits_interest_percent,reserve_amount,reserve_rate,start_date,source_fields) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(position_id) DO NOTHING',[position,snapshot,sourceMoney(raw.commitment_amount),sourceMoney(loan?.principal),sourceMoney(raw.entitlement),raw.pref_rate||null,raw.ownership_interest_pct_current||null,raw.profits_interest_pct||null,sourceMoney(raw.amount),raw.rate||null,raw.start_date||null,JSON.stringify(raw)]);
    if(loan)await tx.query('INSERT INTO investment_loans(id,source_id,position_id,snapshot_id,original_principal,source_terms) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',[stableInvestorId(loan.loan_id!),loan.loan_id,position,snapshot,sourceMoney(loan.principal),JSON.stringify(loan)]);
    for(const event of tabRows(plan.books,'transactions').filter(t=>t.position_id===report.id)){
     const transfer=['TXN-1003','TXN-1004'].includes(event.txn_id!);
     await tx.query('INSERT INTO investment_events(id,source_id,position_id,snapshot_id,event_date,amount,classification,economic_event_key,transfer_group,evidence_reference,source_fields) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(id) DO NOTHING',[stableInvestorId(event.txn_id!),event.txn_id,position,snapshot,event.txn_date,sourceMoney(event.amount),transfer?'internal_transfer':event.direction==='non_cash'?'non_cash':'assumed',event.txn_id,transfer?'sutter-reserve-2026-09-04':null,event.source,JSON.stringify(event)]);
    }
    await tx.query('INSERT INTO investor_reports(id,position_id,title,as_of,snapshot_id,narrative,source_reference) VALUES($1,$2,$3,$4,$5,$6,$7)',[rid,position,`${report.project_name} · ${report.kind==='equity'?'Equity investment':report.kind==='reserve'?'Reserve':'Loan'}`,report.as_of,snapshot,'Reported source balances. Draft and unaudited; not recalculated for today. Terms and payment evidence remain subject to confirmation.',report.source_reference]);
    for(const [i,l] of report.lines.entries())await tx.query('INSERT INTO investor_report_lines(id,report_id,section,label,amount,basis,source_reference,effective_date,ordinal) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[randomUUID(),rid,l.section,l.label,l.amount,l.basis==='projection'?'reported':l.basis,l.source_reference,l.effective_date,i]);
    for(const s of report.schedules)await tx.query('INSERT INTO investor_report_schedules(id,report_id,source_reference,label,scheduled_date,confirmation,note) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),rid,s.source_reference,s.label,s.scheduled_date,s.confirmation,s.note]);
    const findings=[...report.findings];
    if(report.id==='POS-001')findings.push({id:'profits',description:'Confirm profits interest and payout order against executed agreement. Source profits interest is 50%; the visual mock used 42%. Source pays pref before capital; the mock reversed this.',source_value:'50%; pref before capital',comparison_value:'Mock: 42%; capital before pref',source_reference:report.source_reference,status:'pending',resolution:null});
    for(const f of findings)await tx.query('INSERT INTO investor_report_findings(id,report_id,source_reference,description,source_value,comparison_value,status) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),rid,f.source_reference,f.description,f.source_value,f.comparison_value,'pending']);
   }
   for(const p of targets){const id=stableInvestorId(p.source);await tx.query('INSERT INTO report_people(id,source_id,display_name) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[id,p.source,p.name]);await tx.query('INSERT INTO investor_access(person_id,holder_id,granted_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id,stableInvestorId(p.holder),actor.id]);}
   await tx.query('INSERT INTO investor_import_batches(id,digest,source_key,actor_id,summary) VALUES($1,$2,$3,$4,$5)',[batch,plan.digest,'nathan-2026-10-16',actor.id,JSON.stringify({positions:4,people:2,reports:4})]);
   await audit(tx,actor,'import',batch);return {imported:true,digest:plan.digest};
  });
 }
 async beginPreview(personId:string,mode:'investor'|'draft',actor:ReportActor){
  admin(actor);z.uuid().parse(personId);if(!['investor','draft'].includes(mode))throw new Error('Invalid preview mode.');
  const person=(await this.db.query<PreparedInvestor>('SELECT * FROM report_people WHERE id=$1 AND disabled_at IS NULL',[personId])).rows[0];if(!person)throw new Error('Person unavailable.');
  const token=randomBytes(32).toString('hex');
  await this.db.transaction(async tx=>{await tx.query("INSERT INTO investor_preview_sessions(token_hash,admin_id,person_id,mode,expires_at) VALUES($1,$2,$3,$4,now()+interval '30 minutes')",[digest(token),actor.id,personId,mode]);await audit(tx,actor,`preview.start.${mode}`,null,personId);});return token;
 }
 async preview(token:string,actor:ReportActor){
  admin(actor);if(!/^[a-f0-9]{64}$/.test(token))return null;
  const row=(await this.db.query<PreparedInvestor & {mode:'investor'|'draft'}>('SELECT p.*,s.mode FROM investor_preview_sessions s JOIN report_people p ON p.id=s.person_id WHERE s.token_hash=$1 AND s.admin_id=$2 AND s.ended_at IS NULL AND s.expires_at>now() AND p.disabled_at IS NULL',[digest(token),actor.id])).rows[0];
  if(!row)return null;return {person:row,repo:new InvestorReportRepository(this.db,{person:true,draft:row.mode==='draft'}),actor:{id:row.id,admin:false},mode:row.mode};
 }
 async endPreview(token:string,actor:ReportActor){admin(actor);await this.db.transaction(async tx=>{await tx.query('UPDATE investor_preview_sessions SET ended_at=now() WHERE token_hash=$1 AND admin_id=$2',[digest(token),actor.id]);await audit(tx,actor,'preview.exit',null);});}
 async statements(reportIds:string[]){if(!reportIds.length)return [];return (await this.db.query<{id:string;report_id:string;edition:number}>( 'SELECT id,report_id,edition FROM investor_statement_snapshots WHERE report_id=ANY($1::uuid[]) ORDER BY edition DESC',[reportIds])).rows;}
 async ownReports(actor:PlatformActor){return new InvestorReportRepository(this.db).list({...actor,admin:false});}
 async auditDownload(actor:PlatformActor,resource:string,person:string|null=null){await audit(this.db,actor,'download',resource,person);}
 async resolve(findingId:string,note:string,actor:ReportActor){admin(actor);z.uuid().parse(findingId);z.string().trim().min(10).max(2000).parse(note);await this.db.transaction(async tx=>{await tx.query('SELECT r.id FROM investor_reports r JOIN investor_report_findings f ON f.report_id=r.id WHERE f.id=$1 FOR UPDATE OF r',[findingId]);const r=await tx.query('UPDATE investor_report_findings SET status=$2,resolution=$3 WHERE id=$1 AND report_id IN(SELECT id FROM investor_reports WHERE released_at IS NULL) RETURNING id',[findingId,'resolved',note]);if(!r.rows.length)throw new Error('Withdraw the report before changing findings.');await tx.query("UPDATE investor_reports SET review_state='draft' WHERE id=(SELECT report_id FROM investor_report_findings WHERE id=$1)",[findingId]);await audit(tx,actor,'finding.resolve',findingId);});}
 async publication(id:string,operation:'review'|'release'|'withdraw',actor:ReportActor){
  admin(actor);z.uuid().parse(id);await this.db.transaction(async tx=>{
   const report=(await tx.query<{review_state:string}>('SELECT review_state FROM investor_reports WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!report)throw new Error('Report missing.');
   if(operation!=='withdraw'&&(await tx.query("SELECT id FROM investor_report_findings WHERE report_id=$1 AND status='pending'",[id])).rows.length)throw new Error('Resolve all findings with supporting evidence first.');
   if(operation==='review')await tx.query("UPDATE investor_reports SET review_state='reviewed' WHERE id=$1",[id]);
   else if(operation==='release'){if(report.review_state!=='reviewed')throw new Error('Review the report first.');await tx.query('UPDATE investor_reports SET released_at=now(),released_by=$2 WHERE id=$1',[id,actor.id]);}
   else if(operation==='withdraw')await tx.query('UPDATE investor_reports SET released_at=NULL,released_by=NULL WHERE id=$1',[id]);else throw new Error('Invalid operation.');
   await audit(tx,actor,`report.${operation}`,id);
  });
 }
 async setAccess(person:string,holder:string,active:boolean,actor:ReportActor){admin(actor);z.uuid().parse(person);z.uuid().parse(holder);await this.db.transaction(async tx=>{await tx.query('UPDATE investor_access SET revoked_at=CASE WHEN $3 THEN NULL ELSE now() END WHERE person_id=$1 AND holder_id=$2',[person,holder,active]);await audit(tx,actor,active?'access.restore':'access.revoke',holder,person);});}
 async mapAccount(person:string,userId:string|null,actor:ReportActor){admin(actor);z.uuid().parse(person);if(userId)z.uuid().parse(userId);await this.db.transaction(async tx=>{await tx.query('UPDATE report_people SET auth_user_id=$2 WHERE id=$1',[person,userId]);await audit(tx,actor,'identity.map',userId,person);});}
 async statement(id:string,actor:ReportActor){
  admin(actor);z.uuid().parse(id);
  return this.db.transaction(async tx=>{
   await tx.query('SELECT id FROM investor_reports WHERE id=$1 FOR UPDATE',[id]);
   const report=await new InvestorReportRepository({...this.db,query:tx.query.bind(tx)}).get(id,actor);
   if(!report||report.review_state!=='reviewed'||!report.released_at||report.findings.some(f=>f.status==='pending'))throw new Error('Only reviewed, released reports can be issued.');
   const source=(await tx.query<{snapshot_id:string}>('SELECT snapshot_id FROM investor_reports WHERE id=$1',[id])).rows[0];
   const edition=(await tx.query<{n:number}>('SELECT coalesce(max(edition),0)+1 AS n FROM investor_statement_snapshots WHERE report_id=$1',[id])).rows[0].n;
   const sid=randomUUID();await tx.query('INSERT INTO investor_statement_snapshots(id,report_id,edition,source_snapshot_id,payload) VALUES($1,$2,$3,$4,$5)',[sid,id,edition,source.snapshot_id,JSON.stringify({report,issuedBy:actor.id,issuedAt:new Date().toISOString(),calculationVersion:'source-snapshot-v1'})]);await audit(tx,actor,'statement.issue',sid);return sid;
  });
 }
}
