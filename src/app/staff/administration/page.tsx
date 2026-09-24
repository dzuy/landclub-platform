import {requireStaffPage} from '@/lib/staff';
import {database} from '@/lib/database';
import {InvitationRepository} from '@/lib/invitations';
import {InvitationManager} from './form';

export const dynamic='force-dynamic';
export default async function AdministrationPage(){
 await requireStaffPage();const repository=new InvitationRepository(database());await repository.initialize();const invitations=await repository.list();
 return <><header className="dashboard-heading"><div className="eyebrow">STAFF WORKSPACE</div><h1>Members and invitations.</h1><p>Invite people to Land Club and assign the roles that shape their access.</p></header><InvitationManager invitations={invitations}/></>;
}
