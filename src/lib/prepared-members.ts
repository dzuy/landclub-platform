import {z} from 'zod';
import type {Database,Queryable} from './database';
import {memberInfoSchema,type MemberInfo} from './member-properties';
import {readRoles,type ClubRole} from './roles';

export const preparedMemberSchema=memberInfoSchema.extend({email:z.email().max(254)});
export type PreparedMember={id:string;email:string;info:MemberInfo;roles:ClubRole[];status:'draft'|'sending'|'invited';created_at:string;auth_user_id:string|null;failure_reason:string|null;invitation_id:string|null};
export const preparedMembersMigration=`CREATE TABLE IF NOT EXISTS prepared_members (
 id uuid PRIMARY KEY,email text NOT NULL UNIQUE CHECK(email=lower(email)),info jsonb NOT NULL,
 roles text[] NOT NULL CHECK(cardinality(roles)>0 AND roles <@ ARRAY['member','prospect','investor','owner','admin']::text[]),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sending','invited')),
 created_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),auth_user_id uuid UNIQUE,failure_reason text,invitation_id uuid
);`;
export class PreparedMemberRepository{
 constructor(private db:Database){}
 async initialize(){await this.db.query(preparedMembersMigration);await this.db.query('ALTER TABLE prepared_members ADD COLUMN IF NOT EXISTS invitation_id uuid');}
 async get(id:string){return (await this.db.query<PreparedMember>('SELECT * FROM prepared_members WHERE id=$1',[id])).rows[0]||null;}
 async list(){return (await this.db.query<PreparedMember>("SELECT * FROM prepared_members WHERE status<>'invited' ORDER BY created_at DESC")).rows;}
 async create(id:string,input:unknown,roles:ClubRole[],actor:string){const data=preparedMemberSchema.parse(input);const {email,...info}=data;await this.db.query('INSERT INTO prepared_members(id,email,info,roles,created_by) VALUES($1,$2,$3,$4,$5)',[id,email.toLowerCase(),JSON.stringify(info),readRoles(roles),actor]);}
 async edit<T>(id:string,work:(tx:Queryable)=>Promise<T>){return this.db.transaction(async tx=>{const row=(await tx.query<PreparedMember>('SELECT * FROM prepared_members WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!row||row.status!=='draft')throw new Error('This member is no longer a draft. Refresh to continue.');return work(tx);});}
 async saveInfo(id:string,info:MemberInfo){const parsed=memberInfoSchema.parse(info);await this.edit(id,tx=>tx.query('UPDATE prepared_members SET info=$2 WHERE id=$1',[id,JSON.stringify(parsed)]));}
 async saveRoles(id:string,roles:ClubRole[]){await this.edit(id,tx=>tx.query('UPDATE prepared_members SET roles=$2 WHERE id=$1',[id,readRoles(roles)]));}
 async beginDelivery(id:string,invitationId:string|null=null){return this.db.transaction(async tx=>{const row=(await tx.query<PreparedMember>("UPDATE prepared_members SET status='sending',failure_reason=NULL,invitation_id=$2 WHERE id=$1 AND status='draft' RETURNING *",[id,invitationId])).rows[0];if(!row)throw new Error('This invitation is already being sent. Refresh to continue.');return row;});}
 async deliveryFailed(id:string){await this.db.query("UPDATE prepared_members SET status='draft',failure_reason='Invitation could not be sent. Check the email and try again.' WHERE id=$1 AND status='sending'",[id]);}
 async finishDelivery(id:string,userId:string,invitationId:string){await this.db.transaction(async tx=>{
  const row=(await tx.query<PreparedMember>("SELECT * FROM prepared_members WHERE id=$1 AND status='sending' FOR UPDATE",[id])).rows[0];if(!row)throw new Error('Prepared member unavailable.');
  // Bind the saved associations and invitation together before acceptance is possible.
  await tx.query('UPDATE member_properties SET user_id=$2 WHERE user_id=$1',[id,userId]);
  const linked=await tx.query("UPDATE invitations SET status='pending',auth_user_id=$2,sent_at=now(),failure_reason=NULL WHERE id=$1 AND email=$3 AND status='sending' RETURNING id",[invitationId,userId,row.email]);
  if(!linked.rows.length)throw new Error('Invitation could not be linked.');
  await tx.query("UPDATE prepared_members SET status='invited',auth_user_id=$2 WHERE id=$1",[id,userId]);
 });}
}
