import {requireStaffPage} from '@/lib/staff';
import {authAdminClient} from '@/lib/auth/admin';
import {currentUser} from '@/lib/auth/identity';
import {database} from '@/lib/database';
import {InvitationRepository} from '@/lib/invitations';
import {buildMemberDirectory,type AuthDirectoryUser} from '@/lib/members';
import {InvitationForm} from './invitation-form';
import {preparedMemberStore} from '@/lib/prepared-member-store';
import {MemberTable} from './member-table';

export const dynamic='force-dynamic';
export default async function MembersPage(){
 await requireStaffPage();
 const repository=new InvitationRepository(database());await repository.initialize();
 const [invitations,assignments]=await Promise.all([repository.list(),repository.roleAssignments()]);
 let users:AuthDirectoryUser[]=[];
 try{const {data,error}=await authAdminClient().auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;users=data.users;}catch{/* Invitations still provide a useful local directory when Auth administration is unavailable. */}
 if(!users.length){const signedIn=await currentUser();if(signedIn)users=[signedIn];}
 const members=buildMemberDirectory(users,invitations,assignments,process.env.STAFF_USER_IDS);
 const drafts=await (await preparedMemberStore()).list();
 for(const draft of drafts)members.unshift({id:draft.id,name:draft.info.displayName,email:draft.email,roles:draft.roles,status:draft.status==='sending'?'sending':'draft',joinedAt:draft.created_at,lastActiveAt:null,roleTarget:{kind:'prepared',id:draft.id},rolesLocked:draft.status==='sending'});
 return <><header className="dashboard-heading"><div className="eyebrow">STAFF WORKSPACE</div><h1>Members.</h1><p>Invite people to Land Club, understand their activity, and see the roles that shape their access.</p></header><InvitationForm/><MemberTable members={members}/></>;
}
