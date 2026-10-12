'use client';
import {useEffect,useId,useRef,useState} from 'react';
import type {Map as MapboxMap,Marker} from 'mapbox-gl';
import {hasPublicFact} from '@/lib/public-property-fields';
import {travelTime} from '@/lib/property-facts';
import type {PropertyDraft} from '@/lib/schema';
import {validMapPoint,distanceKm,matchesPlace,mapSearchName,propertyLocationQueries,type MapPoint} from '@/lib/property-map';
type Pin={id:string;name:string;point:MapPoint};
const token=process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
export function PropertyMap({property}:{property:PropertyDraft}){
 const mapId=useId();
 const host=useRef<HTMLDivElement>(null),map=useRef<MapboxMap|null>(null),markers=useRef<Map<string,Marker>>(new Map());
 const [pins,setPins]=useState<Pin[]>([]),[status,setStatus]=useState('Loading map…'),[unresolved,setUnresolved]=useState('');
 const payload=JSON.stringify({name:property.name,region:property.region,coordinates:property.coordinates,facts:property.facts,places:property.proximity});
 const hasLocation=(property.coordinates?.state==='Actual'&&validMapPoint(property.coordinates.value))||propertyLocationQueries(property).length>0;
 const showMap=hasLocation&&unresolved!==payload;
 useEffect(()=>{
  if(!hasLocation)return;
  if(!token){setStatus('Map is unavailable.');return;}
  const controller=new AbortController();let instance:MapboxMap|undefined,observer:ResizeObserver|undefined;const activeMarkers=markers.current;setPins([]);setStatus('Loading map…');
  async function lookup(query:string,center?:MapPoint,matchName=''){
   const url=new URL(center?'https://api.mapbox.com/search/searchbox/v1/forward':'https://api.mapbox.com/search/geocode/v6/forward');
   url.search=new URLSearchParams({access_token:token!,q:mapSearchName(query).slice(0,256),limit:'3',...(center?{proximity:`${center.longitude},${center.latitude}`}:{types:'address,place,locality,neighborhood,district,region,country',autocomplete:'false'})}).toString();
   const response=await fetch(url,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw Error('Search unavailable');
   const data=await response.json();
   for(const f of data.features||[]){const c=f.geometry?.coordinates,p={longitude:c?.[0],latitude:c?.[1]};if(validMapPoint(p)&&(!matchName||matchesPlace(matchName,f.properties?.name||f.properties?.name_preferred||''))&&(!center||(matchesPlace(query,f.properties?.name||'')&&distanceKm(center,p)<500)))return p;}
   return null;
  }
  async function start(){
   const data=JSON.parse(payload) as {name:string;region:string;coordinates:PropertyDraft['coordinates'];facts:PropertyDraft['facts'];places:PropertyDraft['proximity']};
   const saved=data.coordinates?.state==='Actual'&&validMapPoint(data.coordinates.value)?data.coordinates.value:null;
   let center:MapPoint|null=saved;
   let locationLabel=data.region;
   if(!center)for(const candidate of propertyLocationQueries(data)){
    if(controller.signal.aborted)return;
    center=await lookup(candidate.query,undefined,candidate.matchName);
    if(center){locationLabel=candidate.query;break;}
   }
   if(controller.signal.aborted)return;
   if(!center){setUnresolved(payload);setStatus('');return;}
   const mb=(await import('mapbox-gl')).default;if(controller.signal.aborted||!host.current)return;
   instance=new mb.Map({container:host.current,accessToken:token,style:'mapbox://styles/mapbox/outdoors-v12',center:[center.longitude,center.latitude],zoom:saved?12:9,cooperativeGestures:true});map.current=instance;
   instance.addControl(new mb.NavigationControl(),'top-right');
   instance.on('error',()=>{if(!controller.signal.aborted)setStatus('Some map content could not load. Please try again later.');});
   observer=new ResizeObserver(()=>instance?.resize());observer.observe(host.current);
   const add=(pin:Pin,primary=false)=>{if(controller.signal.aborted||!instance)return;const button=document.createElement('button');button.type='button';button.className='property-map-pin'+(primary?' property-map-pin-home':'');button.setAttribute('aria-label',pin.name);button.textContent=primary?'⌂':'•';const label=document.createElement('div');label.textContent=pin.name;const marker=new mb.Marker({element:button}).setLngLat([pin.point.longitude,pin.point.latitude]).setPopup(new mb.Popup({offset:20,focusAfterOpen:false}).setDOMContent(label)).addTo(instance);activeMarkers.set(pin.id,marker);setPins(current=>[...current,pin]);};
   add({id:'property',name:saved?data.name:locationLabel,point:center},true);
   setStatus('');
   for(const place of data.places){if(controller.signal.aborted)return;let point=validMapPoint(place.coordinates)?place.coordinates:null;
    if(!point)try{point=await lookup(place.name,center);}catch{if(controller.signal.aborted)return;}
    if(point)add({id:place.id,name:place.name,point});
   }
  }
  void start().catch(()=>{if(!controller.signal.aborted)setStatus('Map is temporarily unavailable.');});
  return()=>{controller.abort();observer?.disconnect();activeMarkers.clear();instance?.remove();map.current=null;};
 },[payload,hasLocation]);
 function focus(pin:Pin){map.current?.flyTo({center:[pin.point.longitude,pin.point.latitude],zoom:pin.id==='property'?12:13});const marker=markers.current.get(pin.id);if(marker&&!marker.getPopup()?.isOpen())marker.togglePopup();}
 return <section id="area" className={'property-block property-area'+(!showMap?' property-area-no-map':'')}><div><h2>The Area</h2><ul>{property.proximity.map(place=>{const pin=pins.find(pin=>pin.id===place.id);return <li key={place.id}>{pin?<a className="property-nearby-link" href={'#'+mapId} onClick={event=>{event.preventDefault();focus(pin);}}>{place.name}</a>:place.name}{hasPublicFact(place.minutes)?` · ${travelTime(place.minutes.value!)}${place.minutes.state==='Planned'?' (planned)':''}`:''}</li>;})}</ul><p>{property.region}</p></div><div className="property-interactive-map" hidden={!showMap}><div id={mapId} ref={host} className="property-map-canvas" aria-label={`Interactive map for ${property.name}`}/>{status&&<p role="status" className="caption">{status}</p>}</div></section>;
}
