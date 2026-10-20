/** Exact decimal arithmetic. This engine is not activated by unverified workbook terms. */
export function cents(value:string){if(!/^-?\d{1,15}\.\d{2}$/.test(value))throw new Error('Use a decimal amount with two places.');const negative=value.startsWith('-'),[a,b]=value.replace('-','').split('.');return (BigInt(a)*100n+BigInt(b))*(negative?-1n:1n);}
export function decimal(value:bigint){const sign=value<0n?'-':'',v=value<0n?-value:value;return `${sign}${v/100n}.${String(v%100n).padStart(2,'0')}`;}
function day(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Use an ISO date.');const n=Date.parse(`${value}T00:00:00Z`);if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==value)throw new Error('Invalid calendar date.');return n/86400000;}
function rounded(n:bigint,d:bigint){return n<0n?-((-n+d/2n)/d):(n+d/2n)/d;}
export type CapitalEvent={date:string;amount:string};
export function simpleAccrual(events:CapitalEvent[],asOf:string,rateBps:number,rounding:'segments'|'final'='final'){
 if(!Number.isInteger(rateBps)||rateBps<0||rateBps>10000)throw new Error('Rate must be basis points between 0 and 10000.');
 const end=day(asOf),grouped=new Map<number,bigint>();for(const e of events){const d=day(e.date);if(d>end)throw new Error('Event occurs after the requested date.');grouped.set(d,(grouped.get(d)??0n)+cents(e.amount));}
 const dates=[...grouped.keys()].sort((a,b)=>a-b),denominator=365n*10000n;let balance=0n,total=0n;const segments:{from:string;to:string;days:number;principal:string;interest:string}[]=[];
 for(let i=0;i<dates.length;i++){const d=dates[i];balance+=grouped.get(d)!;if(balance<0n)throw new Error('Capital cannot become negative.');const next=dates[i+1]??end,days=next-d,num=balance*BigInt(rateBps)*BigInt(days);total+=rounding==='segments'?rounded(num,denominator)*denominator:num;segments.push({from:new Date(d*86400000).toISOString().slice(0,10),to:new Date(next*86400000).toISOString().slice(0,10),days,principal:decimal(balance),interest:decimal(rounded(num,denominator))});}
 return {asOf,principal:decimal(balance),accrued:decimal(rounded(total,denominator)),rateBps,rounding,segments,version:'simple-actual365-v1'};
}
export function loanInterest(events:CapitalEvent[],paid:string,asOf:string,rateBps:number){const value=simpleAccrual(events,asOf,rateBps),net=cents(value.accrued)-cents(paid);return {...value,paid,unpaid:decimal(net>0n?net:0n),prepaid:decimal(net<0n?-net:0n)};}
export function fixedDenominatorShare(entitlement:string,waveCash:string,denominator:string){const d=cents(denominator);if(d<=0n||cents(entitlement)<0n||cents(waveCash)<0n)throw new Error('Invalid distribution inputs.');return decimal(rounded(cents(entitlement)*cents(waveCash),d));}
