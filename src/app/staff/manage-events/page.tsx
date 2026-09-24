import {requireStaffPage} from '@/lib/staff';
import {eventStore} from '@/lib/event-store';
import {EventManager} from './manager';
export default async function Page(){await requireStaffPage();const events=await (await eventStore()).list(true);return <><header className="dashboard-heading"><div className="eyebrow">ADMIN TOOLS</div><h1>Bring people together.</h1><p>Create and manage events for all Land Club members.</p></header><EventManager initial={events}/></>}
