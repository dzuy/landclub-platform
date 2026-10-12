import {requireStaffPage} from '@/lib/staff';
import {eventStore} from '@/lib/event-store';
import {EventManager} from './manager';
export default async function Page(){await requireStaffPage();const events=await (await eventStore()).list(true);return <EventManager initial={events}/>;}
