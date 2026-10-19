import {z} from 'zod';
import type {InvestorReport,ReportLine,ReportFinding} from './investor-reports';
export const sourceWorkbooksSchema=z.array(z.object({filename:z.string(),tabs:z.array(z.object({name:z.string(),rows:z.array(z.record(z.string(),z.string().nullable()))}))}));
export type SourceWorkbooks=z.infer<typeof sourceWorkbooksSchema>;
type Row=Record<string,string|null> & {_source:string};
function rows(books:SourceWorkbooks,tab:string):Row[]{return books.flatMap(b=>b.tabs.filter(t=>t.name===tab).flatMap(t=>t.rows.map((r,i)=>({...r,_source:`${b.filename} / ${tab} / row ${i+2}`}))));}
export function sourceMoney(value:string|null|undefined):string|null{
 if(value==null||value==='')return null;
 if(!/^-?\d+(\.\d{1,2})?$/.test(value))throw new Error(`Unsupported source decimal: ${value}`);
 const [a,b='']=value.split('.');return `${a}.${b.padEnd(2,'0')}`;
}
const label=(key:string)=>key.replaceAll('_',' ');
/** Read-only presentation mapper. Never imports, grants access or computes payable balances. */
export function sourceReviewReports(input:unknown):InvestorReport[]{
 const books=sourceWorkbooksSchema.parse(input),positions=rows(books,'positions'),holders=rows(books,'investors'),entities=rows(books,'entities'),loans=rows(books,'loans');
 const unique=(items:Row[],key:string)=>{const map=new Map<string,Row>();for(const row of items){const id=row[key];if(!id||map.has(id))throw new Error(`Missing or duplicate ${key}`);map.set(id,row);}return map;};
 const holderMap=unique(holders,'investor_id'),entityMap=unique(entities,'entity_id');unique(positions,'position_id');unique(loans,'loan_id');
 return positions.map(p=>{
  const id=p.position_id!,holder=holderMap.get(p.investor_id!),entity=entityMap.get(p.entity_id!);
  if(!holder||!entity)throw new Error(`Unresolved source relationships: ${id}`);
  const loan=loans.find(l=>l.position_id===id),lines:ReportLine[]=[],findings:ReportFinding[]=[];
  const add=(r:Row,fields:string[],section:ReportLine['section']='position')=>{for(const field of fields)if(field in r)lines.push({id:`${id}-${lines.length}`,section,label:label(field),amount:sourceMoney(r[field]),basis:r[field]==null||r[field]===''?'missing':'projection',source_reference:r._source,effective_date:r.as_of_date||r.txn_date||null});};
  add(p,['commitment_amount','entitlement','total_scheduled_all_waves','amount']);
  if(loan)add(loan,['principal']);
  for(const r of rows(books,'capital_account_snapshots').filter(r=>r.position_id===id))add(r,['capital_contributed','capital_returned','capital_outstanding','pref_accrued_to_date','pref_paid_to_date','pref_unpaid','balance_owed_before_profit_split']);
  for(const r of rows(books,'loan_balance_snapshots').filter(r=>r.loan_id===loan?.loan_id))add(r,['principal_outstanding','interest_earned_to_date','interest_paid_to_date','interest_accrued_unpaid','interest_prepaid']);
  for(const r of rows(books,'balance_snapshots').filter(r=>r.position_id===id))add(r,['principal_or_deposits','interest_earned','interest_paid','interest_accrued_unpaid','interest_prepaid','balance_today']);
  for(const r of rows(books,'transactions').filter(r=>r.position_id===id)){
   const transfer=['TXN-1003','TXN-1004'].includes(r.txn_id??'');
   const classification=transfer?'internal transfer; not external cash':r.direction==='non_cash'?'non-cash':'reported transaction; payment evidence pending';
   lines.push({id:r.txn_id!,section:'transactions',label:`${r.txn_id} · ${label(r.txn_type??'')} · ${classification}`,amount:sourceMoney(r.amount),basis:transfer?'internal_transfer':r.direction==='non_cash'?'non_cash':'reported',source_reference:r._source,effective_date:r.txn_date||null});
  }
  const distributions=rows(books,'distributions').filter(r=>r.position_id===id),schedule=rows(books,'payment_schedule').filter(r=>r.loan_id===loan?.loan_id);
  const schedules=[...distributions,...schedule].map((r,i)=>({id:`${id}-schedule-${i}`,label:`${r.distribution_id||r.schedule_id} · ${r.amount||r.payment_amount} USD · ${r.status}`,scheduled_date:r.scheduled_date||null,confirmation:'pending' as const,source_reference:r._source,note:r.same_payment_as?`Same economic payment as ${r.same_payment_as}; do not double count.`:'Source date and payment status require confirmation.'}));
  if(loan)schedules.push({id:`${id}-loan-date`,label:'Next loan payment',scheduled_date:loan.next_payment_due||null,confirmation:'pending',source_reference:loan._source,note:loan.next_payment_due?'Source date supplied; other note terms remain pending.':'No next-payment date supplied. Do not infer one.'});
  for(const r of rows(books,'data_gaps').filter(r=>r._source.split(' / ')[0]===p._source.split(' / ')[0]&&(r.record_id===id||r.record_id===p.investor_id||r.record_id===loan?.loan_id||r.record_id?.includes('all'))))findings.push({id:r.gap_id!,description:r.issue??'Source gap',source_reference:r._source,source_value:null,comparison_value:null,status:'pending',resolution:null});
  const finding=(key:string,description:string,source:string|null,comparison:string|null)=>findings.push({id:key,description,source_value:source,comparison_value:comparison,source_reference:p._source,status:'pending',resolution:null});
  finding('draft','Source values are draft and unaudited; amounts below are source estimates, not verified balances or settled cash.',null,null);
  if(id==='POS-101'){
   finding('dates','Deal wave dates and loan schedule dates conflict. No definitive next-payment date.','Nov 30 / Feb 28 / May 29','Dec 4 / Mar 4 / Jun 4');
   finding('SCH-103','Interest uses 91 days; interval is 90 days. Comparison does not replace source.','2869.45','2837.92');
   finding('SCH-104','Interest uses 91 days; interval is 92 days. Comparison does not replace source.','1436.63','1452.42');
   finding('rounding','Final schedule forces zero despite one-cent arithmetic difference.','0.00','0.01');
   finding('transfer','TXN-1003 and TXN-1004 are linked internal transfer legs; DST-001 and SCH-101 represent the same payment.','47145.82',null);
  }
  if(id==='POS-102')finding('reserve','Reserve is separate from loans. Rate, security and withdrawal terms await a signed agreement. No Reserve transaction controls are enabled.','10% source assumption',null);
  if(id==='POS-121')finding('election','Zengel has not elected between competing terms. No alternative is selected.','42671.00 entitlement / 42804.24 scheduled','45838.00 current-OA alternative');
  if(p.investor_id==='INV-006')finding('visibility','Beneficial-owner shares and full-loan visibility are unresolved. No placeholder access is activated.',null,null);
  const summaryLabels=['capital outstanding','pref unpaid','principal outstanding','interest paid to date','interest prepaid','balance today','interest accrued unpaid'];
  for(const l of lines.filter(l=>summaryLabels.includes(l.label)).slice(0,4))lines.push({...l,id:l.id+'-summary',section:'summary'});
  const sourceKind=p.position_type||p.investment_type||p.role;
  const kindMap:Record<string,InvestorReport['kind']>={equity:'equity',equity_class_a:'equity',loan:'loan',lender:'loan',reserve:'reserve',manager:'manager',manager_profits_interest:'manager',vendor:'vendor',vendor_debt:'vendor_debt',sweat_equity:'sweat_equity'};
  if(!sourceKind||!kindMap[sourceKind])throw new Error(`Unmapped source position kind: ${id}`);
  return {id,title:`${entity.entity_name} · draft source review`,as_of:'2026-10-16',review_state:'draft',released_at:null,project_name:entity.entity_name!,position_name:`${id} · ${label(sourceKind)}`,kind:kindMap[sourceKind],currency:'USD',holder_name:holder.legal_name||holder.display_name!,narrative:'Read-only local review of source snapshots. All amounts retain their source meaning; no accrual, payoff or cash-paid totals have been recalculated.',source_reference:p._source,lines,schedules,findings,documents:[]};
 });
}

export function localSourceReviewAllowed(actor:{admin:boolean;local?:boolean}|null,nodeEnv:string|undefined,host:string){return nodeEnv==='development'&&!!actor?.admin&&/^(127\.0\.0\.1|localhost):3000$/.test(host);}
