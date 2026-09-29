import {z} from 'zod';
import type {Database} from './database';
export const propertyRoleValues=['prospect','investor','owner','guest','manager'] as const;
export const propertyRoleLabels={prospect:'Prospect',investor:'Investor',owner:'Owner',guest:'Guest',manager:'Property manager'};
export const propertyRolesSchema=z.array(z.enum(propertyRoleValues)).min(1,'Select at least one property role.').max(5).transform(roles=>[...new Set(roles)]);
export type PropertyRole=typeof propertyRoleValues[number];
export const memberInfoSchema=z.object({displayName:z.string().trim().min(1,'Enter a name.').max(100),homeRegion:z.string().trim().max(100),contactPhone:z.string().trim().max(50)});
export type MemberInfo=z.infer<typeof memberInfoSchema>;
export type MemberProperty={property_id:string;roles:PropertyRole[];version:number;name:string;region:string};
const identity=z.object({userId:z.uuid(),propertyId:z.uuid()});
export class MemberPropertyRepository{
 constructor(private db:Database){}
 async initialize(){await this.db.query(`CREATE TABLE IF NOT EXISTS member_properties (user_id uuid NOT NULL,property_id uuid NOT NULL REFERENCES properties(id),role text NOT NULL CHECK (role IN ('prospect','investor','owner','guest','manager')),version integer NOT NULL DEFAULT 1,updated_by text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,property_id))`);await this.db.query(`ALTER TABLE member_properties ADD COLUMN IF NOT EXISTS roles text[] CHECK (roles IS NULL OR (cardinality(roles)>0 AND array_position(roles,NULL) IS NULL AND roles <@ ARRAY['prospect','investor','owner','guest','manager']::text[]))`);await this.db.query('UPDATE member_properties SET roles=ARRAY[role] WHERE roles IS NULL');}
 async list(userId:string){z.uuid().parse(userId);return (await this.db.query<MemberProperty>(`SELECT m.property_id,COALESCE(m.roles,ARRAY[m.role]) AS roles,m.version,p.draft->>'name' AS name,p.draft->>'region' AS region FROM member_properties m JOIN properties p ON p.id=m.property_id WHERE m.user_id=$1 ORDER BY p.draft->>'name'`,[userId])).rows;}
 async save(userId:string,propertyId:string,roles:PropertyRole[],actor:{id:string;admin:boolean},version?:number){
  if(!actor.admin)throw new Error('Admin access required.');identity.parse({userId,propertyId});const validatedRoles=propertyRolesSchema.parse(roles);
  if(version===undefined){try{await this.db.query('INSERT INTO member_properties(user_id,property_id,role,roles,updated_by) VALUES($1,$2,$3,$4,$5)',[userId,propertyId,validatedRoles[0],validatedRoles,actor.id]);}catch(error){if((error as {code?:string}).code==='23505')throw new Error('This property is already associated. Refresh the page.');throw error;}}
  else{z.number().int().positive().parse(version);const result=await this.db.query('UPDATE member_properties SET role=$3,roles=$4,version=version+1,updated_by=$5,updated_at=now() WHERE user_id=$1 AND property_id=$2 AND version=$6 RETURNING property_id',[userId,propertyId,validatedRoles[0],validatedRoles,actor.id,version]);if(!result.rows.length)throw new Error('This association changed. Refresh before trying again.');}
 }
 async remove(userId:string,propertyId:string,version:number,actor:{id:string;admin:boolean}){if(!actor.admin)throw new Error('Admin access required.');identity.parse({userId,propertyId});z.number().int().positive().parse(version);const result=await this.db.query('DELETE FROM member_properties WHERE user_id=$1 AND property_id=$2 AND version=$3 RETURNING property_id',[userId,propertyId,version]);if(!result.rows.length)throw new Error('This association changed. Refresh before trying again.');}
}
