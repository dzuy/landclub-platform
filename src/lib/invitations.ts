import type {Database,Queryable} from './database';
import type {ClubRole} from './roles';

export type InvitationStatus='sending'|'pending'|'accepted'|'failed';
export type Invitation={id:string;email:string;roles:ClubRole[];status:InvitationStatus;authUserId:string|null;invitedBy:string;failureReason:string|null;createdAt:string;sentAt:string|null;acceptedAt:string|null};
type InvitationRow={id:string;email:string;roles:ClubRole[];status:InvitationStatus;auth_user_id:string|null;invited_by:string;failure_reason:string|null;created_at:string|Date;sent_at:string|Date|null;accepted_at:string|Date|null};
const schema=`
CREATE TABLE IF NOT EXISTS invitations (
 id uuid PRIMARY KEY,email text NOT NULL CHECK (email = lower(email)),roles text[] NOT NULL DEFAULT ARRAY['member']::text[],
 status text NOT NULL CHECK (status IN ('sending','pending','accepted','failed')),auth_user_id uuid UNIQUE,invited_by text NOT NULL,
 failure_reason text,created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz,accepted_at timestamptz,
 CHECK (cardinality(roles) > 0),CHECK (roles <@ ARRAY['member','prospect','investor','owner','admin']::text[])
);
CREATE UNIQUE INDEX IF NOT EXISTS invitations_active_email ON invitations ((lower(email))) WHERE status IN ('sending','pending');
CREATE INDEX IF NOT EXISTS invitations_created_at ON invitations (created_at DESC);
CREATE TABLE IF NOT EXISTS user_roles (
 user_id uuid NOT NULL,role text NOT NULL CHECK (role IN ('member','prospect','investor','owner','admin')),
 invitation_id uuid REFERENCES invitations(id),granted_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY (user_id,role)
);`;
function invitation(row:InvitationRow):Invitation{return {id:row.id,email:row.email,roles:row.roles,status:row.status,authUserId:row.auth_user_id,invitedBy:row.invited_by,failureReason:row.failure_reason,createdAt:new Date(row.created_at).toISOString(),sentAt:row.sent_at?new Date(row.sent_at).toISOString():null,acceptedAt:row.accepted_at?new Date(row.accepted_at).toISOString():null};}

export class InvitationRepository{
 constructor(private db:Database){}
 async initialize(){for(const statement of schema.split(';').filter(value=>value.trim()))await this.db.query(statement);}
 async begin(id:string,email:string,roles:ClubRole[],invitedBy:string){
  const result=await this.db.query<InvitationRow>('INSERT INTO invitations(id,email,roles,status,invited_by) VALUES($1,$2,$3,\'sending\',$4) RETURNING *',[id,email.toLowerCase(),roles,invitedBy]);return invitation(result.rows[0]);
 }
 async markPending(id:string,authUserId:string){await this.db.query('UPDATE invitations SET status=\'pending\',auth_user_id=$2,sent_at=now(),failure_reason=NULL WHERE id=$1',[id,authUserId]);}
 async markFailed(id:string,reason:string){await this.db.query('UPDATE invitations SET status=\'failed\',failure_reason=$2 WHERE id=$1',[id,reason.slice(0,500)]);}
 async list(){const result=await this.db.query<InvitationRow>('SELECT * FROM invitations ORDER BY created_at DESC LIMIT 100');return result.rows.map(invitation);}
 async pendingForUser(userId:string,email:string){const result=await this.db.query<InvitationRow>('SELECT * FROM invitations WHERE auth_user_id=$1 AND lower(email)=lower($2) AND status=\'pending\' ORDER BY created_at DESC LIMIT 1',[userId,email]);return result.rows[0]?invitation(result.rows[0]):null;}
 async accept(id:string,userId:string){
  return this.db.transaction(async tx=>{
   const result=await tx.query<InvitationRow>('UPDATE invitations SET status=\'accepted\',accepted_at=now() WHERE id=$1 AND auth_user_id=$2 AND status=\'pending\' RETURNING *',[id,userId]);
   const accepted=result.rows[0];if(!accepted)throw new Error('Invitation is no longer available.');
   for(const role of accepted.roles)await tx.query('INSERT INTO user_roles(user_id,role,invitation_id,granted_by) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,role) DO NOTHING',[userId,role,id,accepted.invited_by]);
   return invitation(accepted);
  });
 }
 async hasRole(userId:string,role:ClubRole,queryable:Queryable=this.db){const result=await queryable.query<{allowed:boolean}>('SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id=$1 AND role=$2) AS allowed',[userId,role]);return result.rows[0]?.allowed===true;}
}
