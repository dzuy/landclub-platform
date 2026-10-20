import {z} from 'zod';
import {cents,decimal,simpleAccrual} from './investor-calculations';
export const isoDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===v;},'Invalid calendar date');
const money=z.string().regex(/^\d{1,15}\.\d{2}$/);
// Null means not supplied / not applicable. Drafts must never require invented values.
export const termsSchema=z.object({kind:z.enum(['loan','equity']).nullable().default(null),principal:money.nullable().default(null),currency:z.string().regex(/^[A-Z]{3}$/).nullable().default(null),start:isoDate.nullable().default(null),effective:isoDate.nullable().default(null),rateBps:z.number().int().min(0).max(10000).nullable().default(null),method:z.enum(['simple','compound']).nullable().default(null),dayCount:z.enum(['Actual/365','Actual/360','30/360']).nullable().default(null),frequency:z.enum(['none','monthly','quarterly','annually']).nullable().default(null),paymentSchedule:z.string().max(2000).default(''),maturity:isoDate.nullable().default(null),conditions:z.string().max(4000).default(''),sourceReference:z.string().max(2000).default(''),unresolved:z.string().max(4000).default(''),agreementId:z.uuid().nullable().default(null)}).superRefine((v,c)=>{if(v.effective&&v.start&&v.effective<v.start)c.addIssue({code:'custom',message:'Effective date precedes accrual start'});if(v.maturity&&v.effective&&v.maturity<v.effective)c.addIssue({code:'custom',message:'Maturity precedes effective date'});if(v.method==='simple'&&v.frequency&&v.frequency!=='none')c.addIssue({code:'custom',message:'Simple interest must use no compounding frequency'});if(v.method==='compound'&&v.frequency==='none')c.addIssue({code:'custom',message:'Specify compounding frequency'});});
export type Terms=z.infer<typeof termsSchema>;
export function confirmationIssues(t:Terms){
 const issues:string[]=[];
 for(const field of ['kind','principal','currency','start','effective'] as const)if(t[field]===null)issues.push(`Missing ${field}`);
 if(!t.sourceReference.trim())issues.push('Missing source page/section references');
 if(t.unresolved.trim())issues.push('Resolve ambiguous terms before confirmation');
 if(t.kind==='loan'){
  for(const field of ['rateBps','method','dayCount'] as const)if(t[field]===null)issues.push(`Missing ${field}`);
  if(!t.paymentSchedule.trim())issues.push('Missing payment schedule');
  if(t.method==='compound'&&(!t.frequency||t.frequency==='none'))issues.push('Missing compounding frequency');
 }
 return issues;
}
export type Revision={id:string;version:number;terms:Terms;confirmed:boolean;actor_id?:string;created_at?:string;review?:unknown};
export const transactionSchema=z.object({date:isoDate,amount:money.refine(v=>cents(v)>0n),kind:z.enum(['contribution','principal_repayment','interest_payment']),sourceReference:z.string().trim().min(3).max(2000),sourceEventId:z.uuid().nullable()});
export type TermTransaction=z.infer<typeof transactionSchema>;
export function calculateTerms(history:Revision[],transactions:TermTransaction[],asOf:string){
 isoDate.parse(asOf);
 const revisions=history.filter(r=>r.confirmed&&r.terms.effective!==null&&r.terms.effective<=asOf).sort((a,b)=>a.terms.effective!.localeCompare(b.terms.effective!)||a.version-b.version);
 if(!revisions.length)return {available:false as const,reason:'Pending confirmed terms for this date.'};
 const first=revisions[0].terms;
 if(first.principal===null||first.start===null||first.currency===null)return {available:false as const,reason:'Opening funding terms are missing.'};
 if(first.effective!==first.start)return {available:false as const,reason:'Opening terms must be effective on the accrual start date.'};
 let total=0n,principal=first.principal;
 const segments:ReturnType<typeof simpleAccrual>[]=[];
 for(let i=0;i<revisions.length;i++){
  const t=termsSchema.parse(revisions[i].terms),end=revisions[i+1]?.terms.effective??asOf;
  if(t.unresolved||t.conditions.trim()||t.kind!=='loan'||t.method!=='simple'||t.dayCount!=='Actual/365'||t.rateBps===null||t.effective===null)return {available:false as const,reason:'Calculation unavailable: unresolved, conditional or unsupported instrument terms.'};
  if(t.start!==first.start||t.principal!==first.principal||t.currency!==first.currency)return {available:false as const,reason:'Opening principal, currency and start changes require reconciliation; record capital changes as Transactions.'};
  if(t.maturity&&end>t.maturity)return {available:false as const,reason:'Post-maturity accrual requires reviewed extension terms.'};
  if(transactions.some(e=>e.date<first.start!))return {available:false as const,reason:'Transactions before accrual start require reconciliation.'};
  const events=transactions.filter(e=>e.date>=t.effective!&&e.date<=end&&(i===revisions.length-1||e.date<end)&&e.kind!=='interest_payment').map(e=>({date:e.date,amount:e.kind==='principal_repayment'?decimal(-cents(e.amount)):e.amount}));
  const value=simpleAccrual([{date:t.effective,amount:principal},...events],end,t.rateBps,'final');principal=value.principal;total+=cents(value.accrued);segments.push(value);
 }
 const paid=transactions.filter(e=>e.kind==='interest_payment'&&e.date<=asOf).reduce((n,e)=>n+cents(e.amount),0n),net=total-paid;
 return {available:true as const,asOf,currency:first.currency,principal,accrued:decimal(total),paid:decimal(paid),unpaid:decimal(net>0n?net:0n),prepaid:decimal(net<0n?-net:0n),segments,rounding:'Half away from zero to cents at each effective-dated revision; final rounding within each revision.',version:'reviewed-loan-actual365-v1'};
}
