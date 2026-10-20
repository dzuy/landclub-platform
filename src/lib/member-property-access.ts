import 'server-only';
import {database} from './database';
import {investedPropertyIds,mergePropertyRoles} from './invested-properties';
import {cache} from 'react';
import {z} from 'zod';
import {memberPropertyStore} from './member-property-store';
import {store} from './store';
import type {PropertyRole} from './member-properties';
import type {PropertyDraft} from './schema';

export type MemberPropertyDetail={id:string;roles:PropertyRole[];property:PropertyDraft};
export {homePropertyPhoto as memberPropertyThumbnail} from './member-home';

export const memberPropertyDetails=cache(async(userId:string):Promise<MemberPropertyDetail[]>=>{
 if(!z.uuid().safeParse(userId).success)return [];
 const [manual,invested]=await Promise.all([(await memberPropertyStore()).list(userId),investedPropertyIds(database(),userId)]);
 const associations=mergePropertyRoles(manual,invested);
 const propertyStore=await store();
 const details=await Promise.all(associations.map(async association=>{
  const record=await propertyStore.get(association.property_id);
  return record?{id:association.property_id,roles:association.roles,property:record.published??record.draft}:null;
 }));
 return details.filter((detail):detail is MemberPropertyDetail=>detail!==null).sort((a,b)=>a.property.name.localeCompare(b.property.name));
});

export async function memberPropertyDetail(userId:string,propertyId:string){
 if(!z.uuid().safeParse(propertyId).success)return null;
 return (await memberPropertyDetails(userId)).find(detail=>detail.id===propertyId)??null;
}
