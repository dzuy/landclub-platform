import {automaticallyFollowing} from './property-follows';
import type {Investment} from './member-investments';
import type {PropertyRole} from './member-properties';
import type {PropertyDraft,PropertyRecord} from './schema';
import {publicDraft} from './repository';

export type MemberPropertyDetail={id:string;roles:PropertyRole[];property:PropertyDraft;selectionOnly?:boolean;unpublished?:boolean;explicitFollow?:boolean;automaticFollow?:boolean;following?:boolean};

// Presentation only. Never use this union to authorize documents, reports or sharing.
export async function memberPropertyPresentation(
 associations:{property_id:string;roles:PropertyRole[]}[],
 selections:Investment[],
 getProperty:(id:string)=>Promise<PropertyRecord|null>,
 follows:string[]=[],
):Promise<MemberPropertyDetail[]>{
 const entries=new Map(associations.map(a=>[a.property_id,{roles:a.roles,selectionOnly:false}]));
 for(const selection of selections){
  if(selection.kind==='property'&&!entries.has(selection.id))entries.set(selection.id,{roles:[],selectionOnly:true});
 }
 const relationships=new Set(entries.keys());
 for(const id of follows)if(!entries.has(id))entries.set(id,{roles:[],selectionOnly:false});
 const details=await Promise.all([...entries].map(async([id,entry])=>{
  const record=await getProperty(id);
  if(!record||(!record.published&&!relationships.has(id)))return null;
  const automaticFollow=automaticallyFollowing(entry.roles),explicitFollow=follows.includes(id);
  return {id,...entry,explicitFollow,automaticFollow,following:automaticFollow||explicitFollow,unpublished:!record.published,property:publicDraft(record.published??record.draft)};
 }));
 return details.filter((detail):detail is NonNullable<typeof detail>=>detail!==null).sort((a,b)=>a.property.name.localeCompare(b.property.name));
}
