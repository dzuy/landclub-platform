import test from 'node:test';
import assert from 'node:assert/strict';
import {addMonths,balance,bookingProperties,quoteStay,stayNights,type Booking} from '../src/lib/bookings';
const home=bookingProperties[0],exchange=bookingProperties[1];
const today='2026-10-05';
const booking:Booking={id:'existing',propertyId:'norden',start:'2026-11-01',end:'2026-11-05',guests:2,cost:4,status:'upcoming',refund:false};
test('checkout is exclusive; peak Fridays and Saturdays cost two nights',()=>{
 assert.equal(stayNights('2026-12-04','2026-12-09').length,5);
 const result=quoteStay(home,'2026-12-04','2026-12-09',2,[],today);
 assert.equal(result.error,'');assert.equal(result.cost,7);
 assert.equal(quoteStay(home,'2026-11-09','2026-11-12',2,[],today).error,'');
});
test('rejects an unavailable night inside a range and overlapping personal stays',()=>{
 assert.match(quoteStay(home,'2026-11-10','2026-11-16',2,[],today).error,/already reserved/);
 assert.match(quoteStay(exchange,'2026-11-02','2026-11-06',2,[booking],today).error,/already have a stay/);
});
test('enforces minimums, valid dates, guest limits and exchange window',()=>{
 assert.match(quoteStay(home,'2026-12-01','2026-12-04',2,[],today).error,/at least 5/);
 assert.equal(quoteStay(home,'2026-10-06','2026-10-07',2,[],today).error,'');
 assert.match(quoteStay(exchange,'2027-03-01','2027-03-04',2,[],today).error,/4-month/);
 assert.match(quoteStay(exchange,'2026-11-01','2026-11-04',3,[],today).error,/guests/);
 assert.match(quoteStay(home,'2026-02-30','2026-03-02',2,[],today).error,/Choose a check-in/);
});
test('enforces both annual and exchange balances and refunds only eligible cancellations',()=>{
 assert.equal(balance([booking],'2026').remaining,31);
 assert.equal(balance([{...booking,status:'cancelled',refund:true}],'2026').remaining,35);
 assert.equal(balance([{...booking,status:'cancelled',refund:false}],'2026').remaining,31);
 assert.equal(balance([booking],'2027').remaining,35);
 assert.match(quoteStay(home,'2026-11-06','2026-11-09',2,[{...booking,cost:34}],today).error,/annual/);
 const used:Booking={...booking,propertyId:'shelter',start:'2026-09-01',end:'2026-09-11',cost:10};
 assert.match(quoteStay(exchange,'2026-11-06','2026-11-09',2,[used],today).error,/exchange allowance/);
});
test('date arithmetic clamps month ends and stays cannot silently cross annual allowances',()=>{
 assert.equal(addMonths('2026-10-31',4),'2027-02-28');
 assert.match(quoteStay(home,'2026-12-30','2027-01-04',2,[],today).error,/New Year/);
});
