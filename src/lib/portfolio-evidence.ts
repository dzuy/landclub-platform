import {sourceWorkbooksSchema,sourceMoney} from './investor-source-review';
import {cents,decimal,simpleAccrual} from './investor-calculations';

export type PortfolioEvidence={rate:number|null;ownership:number|null;profitShare:number|null;waterfall:string|null;profitSplit:string|null;debtRate:number|null;debt:string|null;equity:string|null;otherEquity:string|null;total:string|null;segments:ReturnType<typeof simpleAccrual>['segments'];daily:string|null};
/** Only the selected position's terms and anonymous capital aggregates leave the server.
 * This explains a dated workbook snapshot, never activates contractual/live accrual. */
export function portfolioEvidence(input:unknown,positionId:string,asOf:string|null):PortfolioEvidence|null{
 const parsed=sourceWorkbooksSchema.safeParse(input);if(!parsed.success||!asOf)return null;
 const book=parsed.data.find(b=>b.filename==='Land_Club_Investor_Platform_Norden_Cross_Data_2026-10-16.xlsx');if(!book)return null;
 const rows=(tab:string)=>book.tabs.find(t=>t.name===tab)?.rows??[];
 const p=rows('positions').find(p=>p.position_id===positionId);if(!p||p.position_type!=='equity')return null;
 const percent=(v:string|null|undefined)=>v&&Number.isFinite(Number(v))?Number(v)*100:null;
 const snapshots=rows('capital_account_snapshots').filter(s=>s.as_of_date===asOf);
 const own=snapshots.find(s=>s.position_id===positionId);if(!own)return null;
 const equityPositions=rows('positions').filter(v=>v.entity_id===p.entity_id&&v.position_type==='equity');
 const capitals=equityPositions.map(v=>sourceMoney(snapshots.find(s=>s.position_id===v.position_id)?.capital_outstanding));
 const loans=rows('loans').filter(l=>l.entity_id===p.entity_id&&l.status==='active'&&l.lien_position==='1');
 const debts=loans.map(l=>sourceMoney(l.principal_outstanding));
 const equity=capitals.length&&capitals.every(v=>v!==null)?decimal(capitals.reduce((n,v)=>n+cents(v!),0n)):null;
 const debt=debts.length&&debts.every(v=>v!==null)?decimal(debts.reduce((n,v)=>n+cents(v!),0n)):null;
 const principal=sourceMoney(own.capital_outstanding),rate=percent(p.pref_rate);
 const result:PortfolioEvidence={rate,ownership:percent(p.ownership_interest_pct_current),profitShare:percent(p.profits_interest_pct),waterfall:null,profitSplit:null,debtRate:loans.length&&loans.every(l=>l.interest_rate===loans[0].interest_rate)?percent(loans[0].interest_rate):null,debt,equity,otherEquity:equity&&principal?decimal(cents(equity)-cents(principal)):null,total:equity&&debt?decimal(cents(equity)+cents(debt)):null,segments:[],daily:null};
 // Recognize the documented waterfall, not a presumed universal equity rule.
 const workbookText=JSON.stringify(book.tabs);
 const split=workbookText.match(/members (\d+)% pro rata.*?Land Club LLC (\d+)%/);
 if(split)result.profitSplit=`${split[1]}% investors / ${split[2]}% Land Club, after preferred return and capital`;
 if(workbookText.includes('3) unpaid pref, 4) capital'))result.waterfall='After creditors/lenders and member loans: unpaid preferred return, then capital, then remaining profit split. Not guaranteed.';
 if(rate!==null&&p.pref_type==='simple_cumulative_noncompounding'){
  const events=rows('transactions').filter(t=>t.position_id===positionId&&['capital_contribution','return_of_capital'].includes(t.txn_type??'')&&t.txn_date&&t.txn_date<=asOf);
  try{
   const calculation=simpleAccrual(events.map(t=>({date:t.txn_date!,amount:decimal(cents(sourceMoney(t.amount)!)*(t.txn_type==='return_of_capital'?-1n:1n))})),asOf,Math.round(rate*100),'segments');
   // Show an explanation only when both principal and accrual reconcile to the source snapshot.
   if(calculation.principal===principal&&calculation.accrued===sourceMoney(own.pref_accrued_to_date)){
    result.segments=calculation.segments;result.daily=decimal((cents(principal!)*BigInt(Math.round(rate*100))+1825000n)/3650000n);
   }
  }catch{/* Incomplete or conflicting evidence remains pending. */}
 }
 return result;
}
