import type {ClubEvent} from './events';
import type {PropertyDraft} from './schema';

export function homePropertyPhoto(property:PropertyDraft){
 const photo=property.hero?{src:property.hero,alt:property.imageAlt}:property.gallery[0]??property.media.filter(item=>item.kind==='image').map(item=>({src:item.url,alt:item.alt}))[0];
 // Suppress stock demo imagery, but keep photos explicitly uploaded to the property.
 if(!photo||(property.isDemo&&!photo.src.startsWith('/api/property-photos/')))return null;
 return {src:photo.src,alt:photo.alt||property.name};
}
// Legacy events have no demo flag. Exclude explicitly labeled sample content
// from Home without changing or deleting the source records.
export function homeEvents(events:ClubEvent[],now=Date.now()){
 return events.filter(({details:d})=>d.status==='scheduled'&&Date.parse(d.endsAt)>=now&&!/\b(sample|fictional|demo|test event|test venue)\b/i.test(`${d.title} ${d.location} ${d.description}`)).sort((a,b)=>Date.parse(a.details.startsAt)-Date.parse(b.details.startsAt)).slice(0,3);
}
