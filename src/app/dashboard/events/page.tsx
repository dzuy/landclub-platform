import {Events} from '@/components/website/pages';
import {PageHeading} from '@/components/page-heading';
import Link from 'next/link';
import {requireMemberPage} from '@/lib/staff';
import {eventStore} from '@/lib/event-store';
import {EventCard} from '@/components/club-event-card';
export default async function Page(){const actor=await requireMemberPage();const events=await (await eventStore()).list();const now=Date.now();const upcoming=events.filter(e=>Date.parse(e.details.endsAt)>=now);const past=events.filter(e=>Date.parse(e.details.endsAt)<now).reverse();return <><PageHeading title="Events">{actor.admin&&<Link className="button secondary" href="/dashboard/manage-events">Manage events</Link>}</PageHeading><Events authenticated member upcoming={upcoming.length?upcoming.map(event=><EventCard key={event.id} event={event}/>):undefined} past={past.map(event=><EventCard key={event.id} event={event}/>)}/></>}
