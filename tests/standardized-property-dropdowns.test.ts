import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FactInput} from '../src/components/property-fact-input';
import {factDefinitions,factsSchema,type FactKey,type PropertyFact} from '../src/lib/property-facts';
import {countries,usStates} from '../src/lib/property-location-options';
const render=(key:FactKey,value?:PropertyFact)=>renderToStaticMarkup(createElement(FactInput,{label:factDefinitions[key].label,definition:factDefinitions[key],value,onChange:()=>assert.fail('render must not change saved values')}));
test('location dropdowns cover US states and countries without losing nonstandard saved text',()=>{
 assert.equal(usStates.length,51);assert.equal(countries.length,249);
 for(const [key,text] of [['state','CA'],['state','British Columbia'],['country','USA'],['country','Custom region'],['dues_frequency','Yearly']] as const){
  const value={value:text,state:'Planned' as const,notes:'Original qualification'};
  assert.deepEqual(factsSchema.parse({[key]:value})[key],value);
  assert.ok(render(key,value).includes(`<option value="${text}" selected="">${text} (saved value)</option>`));
 }
 assert.match(render('state'),/California/);assert.match(render('country'),/United States/);
});
test('dropdowns preserve omitted, unanswered, false and planned facts',()=>{
 assert.deepEqual(factsSchema.parse({}),{});
 for(const key of ['state','country','dues_frequency','year_round_access','gated','financing_available'] as const){
  assert.match(render(key),/<option value="" selected="">Not entered/);
  const unknown={value:null,state:'Not yet determined' as const,notes:'Awaiting confirmation'};
  assert.deepEqual(factsSchema.parse({[key]:unknown})[key],unknown);
 }
 for(const key of ['year_round_access','gated','financing_available'] as const){
  for(const value of [true,false]){
   const fact={value,state:'Planned' as const,notes:'Keep me'};
   assert.deepEqual(factsSchema.parse({[key]:fact})[key],fact);
   assert.ok(render(key,fact).includes(`<option value="${value}" selected="">${value?'Yes':'No'}</option>`));
  }
 }
 for(const value of ['monthly','quarterly','annual'])assert.ok(render('dues_frequency',{value,state:'Actual'}).includes(`<option selected="">${value}</option>`));
});
