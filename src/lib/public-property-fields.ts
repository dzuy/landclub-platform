import type {PropertyDraft} from './schema';

export function hasPublicValue(value:unknown):boolean{
 if(value===null||value===undefined)return false;
 if(typeof value==='string')return Boolean(value.trim())&&!/^(?:not yet determined|tbd|to be determined)$/i.test(value.trim());
 if(Array.isArray(value))return value.some(hasPublicValue);
 return true; // Zero and false are known values.
}
export function hasPublicFact(fact?:{state:string;value:unknown}):boolean{
 return Boolean(fact&&fact.state!=='Not yet determined'&&hasPublicValue(fact.value));
}
export function visiblePropertyFields(p:PropertyDraft):PropertyDraft{
 return {...p,
  facts:Object.fromEntries(Object.entries(p.facts).filter(([key,fact])=>hasPublicFact(fact)&&!(key==='existing_structures'&&typeof fact?.value==='string'&&/^(?:none[.!]?|(?:none[.!]?\s+)?nothing (?:is )?built yet[.!]?|no (?:existing )?structures[.!]?)$/i.test(fact.value.trim())))),
  phases:p.phases.filter(v=>hasPublicValue(v.scope)||hasPublicFact(v.budget)||hasPublicFact(v.timeline)),
  sections:p.sections.map(s=>({...s,body:hasPublicValue(s.body)?s.body:'',facts:s.facts.filter(f=>hasPublicValue(f.value))})).filter(s=>s.body||s.facts.length),
 };
}
