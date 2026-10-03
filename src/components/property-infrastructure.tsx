'use client';

import {useState} from 'react';
import type {PropertyDraft} from '@/lib/schema';
import {factDefinitions,formatFact,type FactKey} from '@/lib/property-facts';

export const infrastructureGroups:{name:string;keys:FactKey[]}[]=[
 {name:'Access',keys:['road_access','year_round_access','winter_access_notes','gated']},
 {name:'Utilities',keys:['power','water_source','septic_sewer','connectivity']},
 {name:'Buildings & Timeline',keys:['development_stage','planned_structures','shared_amenities','completion_timeline']},
];
export const infrastructureKeys=infrastructureGroups.flatMap(group=>group.keys);

export function PropertyInfrastructure({property}:{property:PropertyDraft}){
 const groups=infrastructureGroups.filter(group=>group.keys.some(key=>property.facts[key]));
 const [selected,setSelected]=useState(groups[0]?.name);
 const current=groups.find(group=>group.name===selected)||groups[0];
 if(!current)return null;
 return <section id="infrastructure" className="property-block"><h2>Site & Infrastructure</h2>
  <div className="property-pills infrastructure-pills" aria-label="Infrastructure categories">{groups.map(group=><button key={group.name} aria-pressed={current.name===group.name} onClick={()=>setSelected(group.name)}>{group.name}</button>)}</div>
  <dl className="property-infrastructure">{current.keys.filter(key=>property.facts[key]).map(key=>{const fact=property.facts[key]!;return <div key={key}><dt>{factDefinitions[key].label}{fact.state!=='Actual'&&<span className="property-status">{fact.state==='Planned'?'Planned':'TBD'}</span>}</dt><dd>{formatFact(fact,property.currency)}{fact.notes&&<p>{fact.notes}</p>}</dd></div>;})}</dl>
 </section>;
}
