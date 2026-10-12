export type MapPoint={latitude:number;longitude:number};
export function validMapPoint(value:unknown):value is MapPoint{
 const p=value as MapPoint|null;return !!p&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180;
}
export function distanceKm(a:MapPoint,b:MapPoint){const r=Math.PI/180,dlat=(b.latitude-a.latitude)*r,dlon=(b.longitude-a.longitude)*r;return 12742*Math.asin(Math.min(1,Math.sqrt(Math.sin(dlat/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(dlon/2)**2)));}
export function matchesPlace(query:string,name:string){const clean=(v:string)=>v.toLowerCase().replace(/\([^)]*\)/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();const q=clean(query),n=clean(name);return !!q&&(n.includes(q)||q===n);}

export function mapSearchName(name:string){return name.replace(/\([^)]*\)/g,'').replace(/[-–—]/g,' ').replace(/\s+/g,' ').trim();}

export function propertyLocationQueries(property:{name:string;region:string;facts:import('./property-facts').PropertyFacts}){
 const known=(value:unknown)=>typeof value==='string'&&value.trim()&&!/^(?:tbd|not yet determined|to be determined|location to be confirmed|location unconfirmed)$/i.test(value.trim())?value.trim():'';
 const fact=(key:'county'|'state'|'country')=>property.facts[key]?.state==='Actual'?known(property.facts[key]?.value):'';
 const county=fact('county'),state=fact('state'),country=fact('country'),region=known(property.region);
 const join=(parts:string[])=>[...new Set(parts.filter(Boolean))].join(', ');
 const context=join([county,state,country]);
 const candidates=[
  ...(known(property.name)&&(region||context)?[{query:join([property.name,region,...[county,state,country].filter(part=>part&&!region.toLowerCase().includes(part.toLowerCase()))]),matchName:property.name}]:[]),
  ...(region?[{query:join([region,...[county,state,country].filter(part=>part&&!region.toLowerCase().includes(part.toLowerCase()))]),matchName:''}]:[]),
  ...(county?[{query:join([county,state,country]),matchName:''}]:[]),
  ...(state?[{query:join([state,country]),matchName:''}]:[]),
  ...(country?[{query:country,matchName:''}]:[]),
 ];
 return candidates.filter((candidate,index)=>candidates.findIndex(item=>item.query.toLowerCase()===candidate.query.toLowerCase())===index);
}
