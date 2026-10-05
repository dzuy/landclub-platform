import {requireMemberPage} from '@/lib/staff';
import {BookingsPage} from '@/components/bookings-page';
export default async function Page(){
 const actor=await requireMemberPage();
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return <BookingsPage memberId={actor.id} today={today}/>;
}
