import 'server-only';
import {store} from './store';
import {memberPropertyDetails} from './member-property-access';
import type {MemberPropertyDetail} from './member-property-presentation';
export async function propertyFollowCatalog(userId:string):Promise<MemberPropertyDetail[]>{
 const [mine,published]=await Promise.all([memberPropertyDetails(userId),(await store()).publishedProperties()]);
 const entries=new Map(mine.map(item=>[item.id,item]));
 for(const item of published)if(!entries.has(item.id))entries.set(item.id,{...item,roles:[],following:false,explicitFollow:false,automaticFollow:false,unpublished:false});
 return [...entries.values()].sort((a,b)=>a.property.name.localeCompare(b.property.name));
}
