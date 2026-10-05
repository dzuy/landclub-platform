import {MemberHome} from '@/components/member-home';
import {currentUser} from '@/lib/auth/identity';
import {readProfile} from '@/lib/profile';
import {requireMemberPage} from '@/lib/staff';
import {memberPropertyDetails} from '@/lib/member-property-access';
import {homeEvents} from '@/lib/member-home';
import {eventStore} from '@/lib/event-store';
export default async function Page(){
 const actor=await requireMemberPage();
 const [user,properties,events]=await Promise.all([currentUser(),memberPropertyDetails(actor.id),(await eventStore()).list()]);
 const name=user?readProfile(user.user_metadata).displayName:'';
 const upcoming=homeEvents(events);
 return <MemberHome name={name||actor.name||''} properties={properties} events={upcoming}/>;
}
