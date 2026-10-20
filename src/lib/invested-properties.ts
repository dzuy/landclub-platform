import {z} from 'zod';
import type {Database} from './database';
import type {PropertyRole} from './member-properties';

export async function investedPropertyIds(db:Database,userId:string):Promise<string[]>{
 if(!z.uuid().safeParse(userId).success)return [];
 const ready=await db.query<{ready:boolean}>("SELECT to_regclass('investment_positions') IS NOT NULL AND to_regclass('prepared_members') IS NOT NULL AS ready");
 if(!ready.rows[0]?.ready)return [];
 // Follow explicit person → holder grants, never matching names or email addresses.
 // Publication status is irrelevant to the underlying investment relationship.
 const result=await db.query<{property_id:string}>(`SELECT DISTINCT COALESCE(position.property_id,entity.property_id) AS property_id
 FROM report_people person
 LEFT JOIN prepared_members member ON member.id=person.prepared_member_id
 JOIN investor_access access ON access.person_id=person.id AND access.revoked_at IS NULL
 JOIN investment_positions position ON position.holder_id=access.holder_id
 LEFT JOIN investment_entities entity ON entity.id=position.entity_id
 WHERE person.disabled_at IS NULL AND position.kind IN ('equity','loan','sweat_equity')
 AND COALESCE(position.property_id,entity.property_id) IS NOT NULL
 AND (person.auth_user_id IS NULL OR member.auth_user_id IS NULL OR person.auth_user_id=member.auth_user_id)
 AND (COALESCE(person.auth_user_id,member.auth_user_id)=$1::uuid
 OR (person.auth_user_id IS NULL AND member.auth_user_id IS NULL AND member.id=$1::uuid))`,[userId]);
 return result.rows.map(row=>row.property_id);
}
export function mergePropertyRoles(manual:{property_id:string;roles:PropertyRole[]}[],invested:string[]){
 const entries=new Map(manual.map(row=>[row.property_id,{property_id:row.property_id,roles:[...row.roles]}]));
 for(const id of invested){const row=entries.get(id);if(row){if(!row.roles.includes('investor'))row.roles.push('investor');}else entries.set(id,{property_id:id,roles:['investor']});}
 return [...entries.values()];
}
