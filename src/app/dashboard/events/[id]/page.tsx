import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireMemberPage} from '@/lib/staff';
import {eventStore} from '@/lib/event-store';
import {EventCard} from '@/components/club-event-card';
export default async function EventPage({params}:{params:Promise<{id:string}>}){
 await requireMemberPage();
 const event=await (await eventStore()).get((await params).id);
 if(!event)notFound();
 return <><nav aria-label="Breadcrumb"><Link href="/dashboard/events">← Events</Link></nav><h1>{event.details.title}</h1><EventCard event={event} detail/></>;
}
