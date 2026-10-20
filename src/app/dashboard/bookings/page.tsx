import {PageHeading} from '@/components/page-heading';
import {requireMemberPage} from '@/lib/staff';
import {BookingsPage} from '@/components/bookings-page';
export default async function Page(){
 const actor=await requireMemberPage();
 if(actor.preview)return <><PageHeading title="Bookings"/><section className="panel"><h2>No booking records available</h2><p>Real booking records have not been connected yet. There are no confirmed stays to display for {actor.name}.</p><p className="muted">Booking is unavailable in read-only preview.</p></section></>;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return <BookingsPage memberId={actor.id} today={today}/>;
}
