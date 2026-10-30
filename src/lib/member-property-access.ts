import 'server-only';
import {propertyFollowStore} from './property-follow-store';
import {database} from './database';
import {investedPropertyIds,mergePropertyRoles} from './invested-properties';
import {cache} from 'react';
import {z} from 'zod';
import {memberPropertyStore} from './member-property-store';
import {store} from './store';
import {memberInvestmentStore} from './member-investment-store';
import {memberPropertyPresentation,type MemberPropertyDetail} from './member-property-presentation';

export type {MemberPropertyDetail} from './member-property-presentation';
export {homePropertyPhoto as memberPropertyThumbnail} from './member-home';

export const memberPropertyDetails=cache(async(userId:string):Promise<MemberPropertyDetail[]>=>{
 const follows=await (await propertyFollowStore()).list(userId);
 const propertyStore=await store();
 if(!z.uuid().safeParse(userId).success)return memberPropertyPresentation([],[],id=>propertyStore.get(id),follows);
 const [manual,invested,selections]=await Promise.all([(await memberPropertyStore()).list(userId),investedPropertyIds(database(),userId),(await memberInvestmentStore()).get(userId)]);
 return memberPropertyPresentation(mergePropertyRoles(manual,invested),selections.entities,id=>propertyStore.get(id),follows);
});

export async function memberPropertyDetail(userId:string,propertyId:string){
 if(!z.uuid().safeParse(propertyId).success)return null;
 return (await memberPropertyDetails(userId)).find(detail=>detail.id===propertyId)??null;
}
