import {z} from 'zod';
import type {Database} from './database';
import {investedPropertyIds} from './invested-properties';
import type {PropertyRole} from './member-properties';

export const automaticFollowRoles:readonly PropertyRole[]=['investor','owner','manager'];
export function automaticallyFollowing(roles:readonly PropertyRole[]){return roles.some(role=>automaticFollowRoles.includes(role));}
export class PropertyFollowError extends Error{constructor(message:string,public status:number){super(message);}}
export type FollowActor={id:string;preview?:unknown};
export class PropertyFollowRepository{
 constructor(private db:Database){}
 async list(userId:string){return (await this.db.query<{property_id:string}>('SELECT property_id FROM property_follows WHERE user_id=$1 ORDER BY created_at,property_id',[userId])).rows.map(row=>row.property_id);}
 async automatic(userId:string,propertyId:string){
  if(!z.uuid().safeParse(userId).success)return false;
  const manual=await this.db.query<{roles:PropertyRole[]}>('SELECT COALESCE(roles,ARRAY[role]) AS roles FROM member_properties WHERE user_id=$1 AND property_id=$2',[userId,propertyId]);
  return automaticallyFollowing(manual.rows[0]?.roles??[])||(await investedPropertyIds(this.db,userId)).includes(propertyId);
 }
 async set(actor:FollowActor,propertyId:string,following:boolean){
  if(actor.preview)throw new PropertyFollowError('Following is read-only in View as. Exit the preview to make changes.',403);
  if(!actor.id)throw new PropertyFollowError('Please sign in.',401);
  z.uuid().parse(propertyId);
  if(await this.automatic(actor.id,propertyId)){
   if(!following)throw new PropertyFollowError('This property is automatically followed while your investment, ownership or management relationship exists.',409);
   return;
  }
  await this.db.transaction(async tx=>{
   if(following){
    // Lock against unpublishing while accepting a new follow; all offering statuses qualify.
    const published=await tx.query('SELECT id FROM properties WHERE id=$1 AND published IS NOT NULL FOR SHARE',[propertyId]);
    if(!published.rows.length)throw new PropertyFollowError('This property is no longer available to follow.',404);
    await tx.query('INSERT INTO property_follows(user_id,property_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[actor.id,propertyId]);
   }else await tx.query('DELETE FROM property_follows WHERE user_id=$1 AND property_id=$2',[actor.id,propertyId]);
  });
 }
}
