import type {Invitation,UserRoleAssignment} from './invitations';
import type {ClubRole} from './roles';

export type AuthDirectoryUser={
 id:string;
 email?:string;
 created_at:string;
 last_sign_in_at?:string;
 email_confirmed_at?:string;
 user_metadata?:Record<string,unknown>;
};
export type MemberDirectoryRow={id:string;name:string|null;email:string;roles:ClubRole[];status:'active'|'invited';joinedAt:string;lastActiveAt:string|null};

function displayName(metadata:Record<string,unknown>|undefined){
 const value=metadata?.display_name??metadata?.full_name??metadata?.name;
 return typeof value==='string'&&value.trim()?value.trim():null;
}

export function buildMemberDirectory(users:AuthDirectoryUser[],invitations:Invitation[],assignments:UserRoleAssignment[],bootstrapIds:string|undefined){
 const bootstrap=new Set((bootstrapIds||'').split(',').map(value=>value.trim()).filter(Boolean));
 const rolesByUser=new Map<string,ClubRole[]>();
 for(const assignment of assignments){const roles=rolesByUser.get(assignment.userId)||[];if(!roles.includes(assignment.role))roles.push(assignment.role);rolesByUser.set(assignment.userId,roles);}
 const invitationByUser=new Map(invitations.filter(item=>item.authUserId).map(item=>[item.authUserId as string,item]));
 const rows:MemberDirectoryRow[]=users.map(user=>{
  const invitation=invitationByUser.get(user.id),assigned=rolesByUser.get(user.id);
  const roles:ClubRole[]=assigned?.length?assigned:invitation?.roles.length?invitation.roles:bootstrap.has(user.id)?['admin']:['member'];
  return {id:user.id,name:displayName(user.user_metadata),email:user.email||invitation?.email||'Email unavailable',roles,status:invitation?.status==='pending'||invitation?.status==='sending'?'invited':'active',joinedAt:user.created_at,lastActiveAt:user.last_sign_in_at||null};
 });
 const included=new Set(rows.map(row=>row.id));
 for(const invitation of invitations){if(invitation.status==='failed'||invitation.authUserId&&included.has(invitation.authUserId))continue;rows.push({id:`invitation:${invitation.id}`,name:null,email:invitation.email,roles:invitation.roles,status:invitation.status==='accepted'?'active':'invited',joinedAt:invitation.createdAt,lastActiveAt:null});}
 return rows.sort((a,b)=>Date.parse(b.joinedAt)-Date.parse(a.joinedAt));
}
