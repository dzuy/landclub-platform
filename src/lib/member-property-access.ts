import 'server-only';
import {cache} from 'react';
import {z} from 'zod';
import {memberPropertyStore} from './member-property-store';
import {store} from './store';
import type {PropertyRole} from './member-properties';
import type {PropertyDraft} from './schema';

export type MemberPropertyDetail={id:string;roles:PropertyRole[];property:PropertyDraft};
const categoryImages:Record<PropertyDraft['category'],string>={Mountains:'/images/landscape.png',Farms:'/images/farm.jpg',Coast:'/images/coast.jpg',Desert:'/images/desert.jpg',Heritage:'/images/interior.jpg',Unclassified:'/images/landscape.png'};

export function memberPropertyThumbnail(property:PropertyDraft){
 const gallery=property.gallery[0],media=property.media.find(item=>item.kind==='image');
 if(property.hero)return {src:property.hero,alt:property.imageAlt};
 if(gallery)return {src:gallery.src,alt:gallery.alt};
 if(media)return {src:media.url,alt:media.alt};
 return {src:categoryImages[property.category],alt:`Regional ${property.category.toLowerCase()} reference for ${property.name}`};
}

export const memberPropertyDetails=cache(async(userId:string):Promise<MemberPropertyDetail[]>=>{
 if(!z.uuid().safeParse(userId).success)return [];
 const associations=await (await memberPropertyStore()).list(userId);
 const propertyStore=await store();
 const details=await Promise.all(associations.map(async association=>{
  const record=await propertyStore.get(association.property_id);
  return record?{id:association.property_id,roles:association.roles,property:record.published??record.draft}:null;
 }));
 return details.filter((detail):detail is MemberPropertyDetail=>detail!==null);
});

export async function memberPropertyDetail(userId:string,propertyId:string){
 if(!z.uuid().safeParse(propertyId).success)return null;
 return (await memberPropertyDetails(userId)).find(detail=>detail.id===propertyId)??null;
}
