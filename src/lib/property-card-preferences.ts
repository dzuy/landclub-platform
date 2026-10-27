import {z} from 'zod';
import type {Database} from './database';

export const cardOrderInput=z.object({order:z.array(z.uuid()).max(1000).refine(ids=>new Set(ids).size===ids.length,'Duplicate properties.'),version:z.number().int().min(0)}).strict();
export type CardOrderPreference={order:string[];version:number};
export class CardOrderConflict extends Error{}
export class PropertyCardPreferences{
 constructor(private db:Database){}
 async read(userId:string):Promise<CardOrderPreference>{
  const row=(await this.db.query<CardOrderPreference>('SELECT property_ids AS "order",version FROM member_property_card_order WHERE user_id=$1',[userId])).rows[0];
  return row??{order:[],version:0};
 }
 async save(userId:string,input:unknown,allowedIds:string[]):Promise<CardOrderPreference>{
  const {order,version}=cardOrderInput.parse(input),allowed=new Set(allowedIds);
  if(order.some(id=>!allowed.has(id)))throw new Error('Property access changed. Refresh the page.');
  const result=version===0
   ?await this.db.query<CardOrderPreference>('INSERT INTO member_property_card_order(user_id,property_ids) VALUES($1,$2::jsonb) ON CONFLICT(user_id) DO NOTHING RETURNING property_ids AS "order",version',[userId,JSON.stringify(order)])
   :await this.db.query<CardOrderPreference>('UPDATE member_property_card_order SET property_ids=$2::jsonb,version=version+1,updated_at=now() WHERE user_id=$1 AND version=$3 RETURNING property_ids AS "order",version',[userId,JSON.stringify(order),version]);
  if(!result.rows[0])throw new CardOrderConflict('Property order changed on another device.');
  return result.rows[0];
 }
}
