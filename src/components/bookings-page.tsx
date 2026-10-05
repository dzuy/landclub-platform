'use client';
import {PageHeading} from '@/components/page-heading';
import {useEffect,useRef,useState} from 'react';
import {addDays,addMonths,balance,bookingProperties,bookingRules,initialBookings,nightCost,quoteStay,savedBookingsSchema,unavailable,type Booking,type BookingProperty} from '@/lib/bookings';
import s from './bookings-page.module.css';

function pretty(day:string,options:Intl.DateTimeFormatOptions={month:'short',day:'numeric'}){return new Intl.DateTimeFormat('en-US',{...options,timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'))}
function Arrow({direction='right'}:{direction?:'right'|'left'}){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={direction==='left'?{transform:'rotate(180deg)'}:undefined}><path d="M4 12h15m-6-6 6 6-6 6"/></svg>}

export function BookingsPage({memberId,today}:{memberId:string;today:string}){
 const [bookings,setBookings]=useState<Booking[]>(()=>initialBookings(today));
 const [ready,setReady]=useState(false),[notice,setNotice]=useState('');
 const [tab,setTab]=useState<'home'|'exchange'>('home'),[selected,setSelected]=useState('norden');
 const [month,setMonth]=useState(today.slice(0,7)+'-01');
 const [start,setStart]=useState(''),[end,setEnd]=useState(''),[guests,setGuests]=useState(2),[review,setReview]=useState(false);
 const [stayTab,setStayTab]=useState<'upcoming'|'past'|'cancelled'>('upcoming');
 const [cancelId,setCancelId]=useState<string|null>(null);
 const planner=useRef<HTMLElement>(null),reviewHeading=useRef<HTMLHeadingElement>(null);
 const storageKey=`land-club-bookings-preview-v1:${memberId}`;
 const property=bookingProperties.find(p=>p.id===selected)!;
 const quote=quoteStay(property,start,end,guests,bookings,today);
 const year=start?start.slice(0,4):today.slice(0,4),allowance=balance(bookings,year);
 useEffect(()=>{try{const value=localStorage.getItem(storageKey);if(value){const parsed=savedBookingsSchema.safeParse(JSON.parse(value));if(parsed.success)setBookings(parsed.data);else setNotice('Saved preview could not be read. Showing the sample stay.');}}catch{setNotice('Browser storage is unavailable. Trial bookings will last for this visit only.');}setReady(true)},[storageKey]);
 useEffect(()=>{if(review)reviewHeading.current?.focus()},[review]);
 function save(next:Booking[]){setBookings(next);try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{setNotice('Saved for this visit only. Browser storage is unavailable.')}}
 function chooseProperty(p:BookingProperty){setSelected(p.id);setMonth(today.slice(0,7)+'-01');setStart('');setEnd('');setReview(false);setGuests(Math.min(guests,p.capacity))}
 function changeTab(next:'home'|'exchange'){setTab(next);chooseProperty(bookingProperties.find(p=>p.kind===next)!)}
 function pick(day:string){setReview(false);if(!start||end||day<=start){setStart(day);setEnd('')}else setEnd(day)}
 function reserve(){const check=quoteStay(property,start,end,guests,bookings,today);if(check.error){setReview(false);setNotice(check.error);return;}save([...bookings,{id:crypto.randomUUID(),propertyId:property.id,start,end,guests,cost:check.cost,status:'upcoming',refund:false}]);setNotice(`Trial booking saved: ${property.name}, ${pretty(start)}–${pretty(end)}.`);setStart('');setEnd('');setReview(false);setStayTab('upcoming')}
 function cancel(booking:Booking){const refund=booking.start>=addDays(today,bookingRules.cancellationDays);save(bookings.map(b=>b.id===booking.id?{...b,status:'cancelled',refund}:b));setCancelId(null);setNotice(refund?'Stay cancelled. Nights returned.':'Stay cancelled. Late cancellations do not return nights.')}
 const visible=bookings.filter(b=>stayTab==='cancelled'?b.status==='cancelled':b.status!=='cancelled'&&(stayTab==='past'?b.end<=today:b.end>today)).sort((a,b)=>a.start.localeCompare(b.start));
 const daysInMonth=new Date(Date.parse(addMonths(month,1)+'T12:00:00Z')-86400000).getUTCDate();
 const offset=new Date(month+'T12:00:00Z').getUTCDay();
 const limit=addMonths(today,property.kind==='home'?12:4);
 return <div className={s.page}>
  <PageHeading title="Bookings"><button className={s.primary} onClick={()=>{planner.current?.scrollIntoView({behavior:'smooth',block:'start'});document.getElementById('booking-property')?.focus()}}>New booking <Arrow/></button></PageHeading>
  <p className={s.preview}>Preview · Sample availability. Bookings are saved in this browser only.</p>
  {notice&&<div className={s.notice} role="status"><span>{notice}</span><button aria-label="Dismiss notification" onClick={()=>setNotice('')}>×</button></div>}
  <div className={s.balance}><span>{year}</span><span><strong>{allowance.remaining} / 35</strong> nights left</span><span><strong>{allowance.exchangeRemaining}</strong> available for exchange</span></div>
  <section className={s.stays}><div className={s.sectionHeading}><h2>Your stays</h2><div className={s.tabs} aria-label="Filter stays">{(['upcoming','past','cancelled'] as const).map(t=><button key={t} aria-pressed={stayTab===t} onClick={()=>setStayTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}</div></div>
   {visible.length?visible.map(b=>{const p=bookingProperties.find(p=>p.id===b.propertyId)!;return <article className={s.stay} key={b.id}><div className={s.stayBody}><span className={s.tag}>{p.kind==='exchange'?'Exchange':null}</span><h3>{p.name}</h3><p>{pretty(b.start,{month:'short',day:'numeric',year:'numeric'})} – {pretty(b.end,{month:'short',day:'numeric',year:'numeric'})}</p><small>{p.unit} · {b.guests} guests · {b.cost} allowance nights{b.status==='cancelled'?(b.refund?' returned':' retained'):''}</small></div><div className={s.stayAction}>{b.status==='upcoming'&&b.start>=today&&(cancelId===b.id?<div className={s.cancel}><p>{b.start>=addDays(today,30)?'Cancel and return your nights?':'Within 30 days: nights will not be returned. Cancel?'}</p><button onClick={()=>cancel(b)}>Cancel trial stay</button><button className={s.textButton} onClick={()=>setCancelId(null)}>Keep stay</button></div>:<button className={s.outline} disabled={!ready} onClick={()=>setCancelId(b.id)}>Cancel stay</button>)}</div></article> }):<div className={s.empty}><p>No {stayTab} stays.</p></div>}
  </section>
  <section ref={planner} className={s.planner}><div className={s.sectionHeading}><h2>New booking</h2></div>
   <div className={s.mode}><button aria-pressed={tab==='home'} onClick={()=>changeTab('home')}>My property</button><button aria-pressed={tab==='exchange'} onClick={()=>changeTab('exchange')}>Exchange</button></div>
   <div className={s.layout}><div className={s.availability}>
    <label className={s.propertySelect}>Property<select id="booking-property" value={selected} onChange={e=>chooseProperty(bookingProperties.find(p=>p.id===e.target.value)!)}>{bookingProperties.filter(p=>p.kind===tab).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <p className={s.propertyDetail}>{property.unit} · {property.capacity} guests max</p>
    <div className={s.calendarHeader}><div><h3>{pretty(month,{month:'long',year:'numeric'})}</h3><p>{start&&!end?'Select check-out':'Select dates'}</p></div><div><button aria-label="Previous month" disabled={month<=today.slice(0,7)+'-01'} onClick={()=>setMonth(addMonths(month,-1))}><Arrow direction="left"/></button><button aria-label="Next month" disabled={month.slice(0,7)>=limit.slice(0,7)} onClick={()=>setMonth(addMonths(month,1))}><Arrow/></button></div></div>
    <div className={s.calendar}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span className={s.weekday} key={d}>{d}</span>)}{Array.from({length:offset},(_,i)=><span key={`blank-${i}`}/>)}{Array.from({length:daysInMonth},(_,i)=>{const day=addDays(month,i),blocked=unavailable(property,day,bookings),checkout=!!start&&!end&&day>start;const disabled=day<today||day>addDays(limit,checkout?1:0)||(blocked&&!checkout);return <button key={day} disabled={disabled} aria-label={`${pretty(day,{weekday:'long',month:'long',day:'numeric'})}, ${blocked?'reserved':`${nightCost(property,day)} allowance night${nightCost(property,day)>1?'s':''}`}${day===start?', check-in':day===end?', check-out':''}`} aria-pressed={day===start||day===end} className={`${s.day} ${blocked?s.blocked:''} ${day===start||day===end?s.selected:''} ${start&&end&&day>start&&day<end?s.inRange:''}`} onClick={()=>pick(day)}><span>{i+1}</span><small>{blocked?'—':nightCost(property,day)===2?'2×':'·'}</small></button>})}</div>
    <div className={s.legend}><span><i/> Available</span><span><i className={s.reservedKey}/> Reserved</span><span><b>2×</b> Peak weekend</span></div>
   </div><aside className={s.summary}>
    <h3 ref={reviewHeading} tabIndex={-1}>{review?'Review booking':'Stay details'}</h3>
    <form onSubmit={e=>{e.preventDefault();if(!quote.error){if(review)reserve();else setReview(true)}}}>
     <div className={s.dates}><label>Check-in<input required type="date" value={start} min={today} max={limit} onInput={e=>{const value=e.currentTarget.value;setStart(value);setReview(false);if(value)setMonth(value.slice(0,7)+'-01')}} onChange={e=>setStart(e.target.value)}/></label><label>Check-out<input required type="date" value={end} min={start?addDays(start,1):today} max={addDays(limit,1)} onInput={e=>{setEnd(e.currentTarget.value);setReview(false)}} onChange={e=>setEnd(e.target.value)}/></label></div>
     <label className={s.guests}>Guests<select value={guests} onChange={e=>{setGuests(Number(e.target.value));setReview(false)}}>{Array.from({length:property.capacity},(_,i)=><option key={i} value={i+1}>{i+1} {i===0?'guest':'guests'}</option>)}</select></label>
     <div className={s.totals}><div><span>Stay</span><strong>{quote.nights||'—'} nights</strong></div><div><span>Nights used</span><strong>{quote.cost||'—'} nights</strong></div>{tab==='exchange'&&<div><span>Exchange nights</span><strong>{quote.nights||'—'} of {allowance.exchangeRemaining}</strong></div>}<div className={s.total}><span>Nights remaining</span><strong>{quote.nights?Math.max(0,quote.remaining):allowance.remaining} nights</strong></div></div>
     {start&&end&&quote.error&&<p className={s.error} role="alert">{quote.error}</p>}
     {review&&<div className={s.review}><strong>{pretty(start)} – {pretty(end)}</strong><p>{property.unit} for {guests} guests. Cancel 30+ days ahead to get your nights back. Cleaning is extra.</p></div>}
     <button className={s.primary} type="submit" disabled={!ready||!!quote.error}>{review?'Save trial booking':'Review stay'} <Arrow/></button>{review&&<button type="button" className={s.textButton} onClick={()=>setReview(false)}>Back to dates</button>}
     
    </form>
   </aside></div>
  </section>
  <details className={s.rules}><summary>Booking rules</summary><ul><li>35 weighted nights per year; up to 11 on exchange. Peak Fridays and Saturdays use two nights. No rollover.</li><li>Book 12 months ahead at home or four months on exchange.</li><li>Minimum stay: three nights, five in peak season, or one within 30 days of arrival.</li><li>Cancel 30+ days ahead for a full return of nights.</li></ul><button className={s.textButton} disabled={!ready} onClick={()=>{save(initialBookings(today));setStart('');setEnd('');setReview(false);setCancelId(null);setStayTab('upcoming');setNotice('Preview reset to its sample stay.')}}>Reset trial bookings</button></details>
 </div>
}
