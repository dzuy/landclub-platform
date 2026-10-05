import {z} from 'zod';

// Provisional HOW rules, isolated so confirmed property policies can replace them.
export const bookingRules={annualNights:35,exchangeNights:11,homeWindow:12,exchangeWindow:4,standardMinimum:3,peakMinimum:5,cancellationDays:30};
export const bookingProperties=[
 {id:'norden',name:'Norden Cross',region:'Sierra Nevada, California',image:'/images/landscape.png',kind:'home',description:'Slow mornings. Mountain air. A place to return to.',unit:'Whole property',capacity:8,peakMonths:[1,2,3,7,8,12]},
 {id:'shelter',name:'Land Club Inn at Shelter Cove',region:'Lost Coast, California',image:'/images/coast.jpg',kind:'exchange',description:'Trade the everyday for a few days by the Pacific.',unit:'One suite',capacity:2,peakMonths:[6,7,8,9]},
 {id:'point-reyes',name:'Point Reyes',region:'Marin County, California',image:'/images/farm.jpg',kind:'exchange',description:'Open landscapes and an unhurried coastal rhythm.',unit:'One cabin',capacity:4,peakMonths:[6,7,8,9]},
] as const;
export type BookingProperty=typeof bookingProperties[number];
export const bookingSchema=z.object({id:z.string(),propertyId:z.enum(['norden','shelter','point-reyes']),start:z.iso.date(),end:z.iso.date(),guests:z.number().int().min(1).max(8),cost:z.number().int().positive().max(35),status:z.enum(['upcoming','cancelled']),refund:z.boolean().default(false)});
export type Booking=z.infer<typeof bookingSchema>;
export const savedBookingsSchema=z.array(bookingSchema).max(200);
export function dateKey(date:Date){return date.toISOString().slice(0,10)}
export function addDays(day:string,n:number){const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+n);return dateKey(date)}
export function addMonths(day:string,n:number){const date=new Date(day+'T12:00:00Z'),d=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+n);const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(d,last));return dateKey(date)}
export function stayNights(start:string,end:string){if(!z.iso.date().safeParse(start).success||!z.iso.date().safeParse(end).success||end<=start)return [];const length=(Date.parse(end)-Date.parse(start))/86400000;if(length>366)return [];return Array.from({length},(_,i)=>addDays(start,i))}
export function isPeak(property:BookingProperty,day:string){return (property.peakMonths as readonly number[]).includes(Number(day.slice(5,7)))}
export function nightCost(property:BookingProperty,day:string){const weekday=new Date(day+'T12:00:00Z').getUTCDay();return isPeak(property,day)&&(weekday===5||weekday===6)?2:1}
export function balance(bookings:Booking[],year:string){const charged=bookings.filter(b=>b.start.startsWith(year)&&(b.status!=='cancelled'||!b.refund));return {remaining:bookingRules.annualNights-charged.reduce((sum,b)=>sum+b.cost,0),exchangeRemaining:bookingRules.exchangeNights-charged.filter(b=>b.propertyId!=='norden').reduce((sum,b)=>sum+stayNights(b.start,b.end).length,0)}}
export function unavailable(property:BookingProperty,day:string,bookings:Booking[]){
 // Illustrative shared inventory; never represents another member's actual stay.
 const d=Number(day.slice(8));
 return (d>=12&&d<=14)||(d>=23&&d<=24)||bookings.some(b=>b.propertyId===property.id&&b.status==='upcoming'&&day>=b.start&&day<b.end);
}
export function quoteStay(property:BookingProperty,start:string,end:string,guests:number,bookings:Booking[],today:string){
 const nights=stayNights(start,end),cost=nights.reduce((total,day)=>total+nightCost(property,day),0),limit=addMonths(today,property.kind==='home'?bookingRules.homeWindow:bookingRules.exchangeWindow),remaining=balance(bookings,start.slice(0,4));
 let error='';
 if(!nights.length)error='Choose a check-in and a later check-out date.';
 else if(start<today)error='Choose a check-in date from today onward.';
 else if(nights[nights.length-1]>limit)error=`These dates are outside the ${property.kind==='home'?bookingRules.homeWindow:bookingRules.exchangeWindow}-month booking window.`;
 else if(nights.some(day=>day.slice(0,4)!==start.slice(0,4)))error='For now, book stays across New Year as two separate reservations.';
 else if(!Number.isInteger(guests)||guests<1||guests>property.capacity)error=`Choose between 1 and ${property.capacity} guests.`;
 else if(nights.some(day=>unavailable(property,day,bookings)))error='Some nights are already reserved. Choose another date range.';
 else if(bookings.some(b=>b.status==='upcoming'&&start<b.end&&end>b.start))error='You already have a stay during these dates.';
 else if(nights.length<(start<=addDays(today,30)?1:nights.some(day=>isPeak(property,day))?bookingRules.peakMinimum:bookingRules.standardMinimum))error=`Choose at least ${nights.some(day=>isPeak(property,day))?bookingRules.peakMinimum:bookingRules.standardMinimum} nights, or book within 30 days of arrival.`;
 else if(cost>remaining.remaining)error='This stay exceeds your remaining annual night allowance.';
 else if(property.kind==='exchange'&&nights.length>remaining.exchangeRemaining)error='This stay exceeds your remaining exchange allowance.';
 return {nights:nights.length,cost,error,remaining:remaining.remaining-cost};
}
export function initialBookings(today:string):Booking[]{const month=addMonths(today.slice(0,7)+'-01',1),start=month.slice(0,8)+'06',end=addDays(start,5);return [{id:'sample-stay',propertyId:'norden',start,end,guests:2,cost:stayNights(start,end).reduce((sum,d)=>sum+nightCost(bookingProperties[0],d),0),status:'upcoming',refund:false}]}
