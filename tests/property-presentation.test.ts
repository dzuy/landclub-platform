import {PropertyPage} from '../src/components/property-page';
import {visiblePropertyFields} from '../src/lib/public-property-fields';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readDraft} from '../src/lib/schema';
import seeds from '../src/lib/seed-properties.json';
import {PropertyGallery} from '../src/components/property-gallery';
import {PropertyInfrastructure} from '../src/components/property-infrastructure';

// Properties can have media without a legacy photo gallery, and unknown fields
// must remain unknown instead of acquiring values from the design reference.
test('gallery supports aerial-only records and preserves captions and planned state',()=>{
 const property=readDraft({...seeds[0],gallery:[],media:[{id:'aerial',role:'aerial',kind:'image',url:'/images/landscape.png',alt:'Planned aerial layout',caption:'Subject to design review.',state:'Planned'}]});
 const original=JSON.stringify(property);
 const html=renderToStaticMarkup(createElement(PropertyGallery,{property}));
 assert.match(html,/Aerial/);
 assert.match(html,/Subject to design review\./);
 assert.match(html,/Planned/);
 assert.doesNotMatch(html,/>Photos<|>Site Plan</);
 assert.equal(JSON.stringify(property),original);
});

test('infrastructure hides unknown fields and keeps planned and false values visible',()=>{
 const property=readDraft({...seeds[0],facts:{road_access:{value:'gravel',state:'Planned',notes:'Awaiting approval.'},winter_access_notes:{value:null,state:'Not yet determined'},gated:{value:false,state:'Actual'}}});
 const html=renderToStaticMarkup(createElement(PropertyInfrastructure,{property}));
 assert.match(html,/gravel \(planned\)/);
 assert.doesNotMatch(html,/Awaiting approval\./);
 assert.doesNotMatch(html,/Not yet determined|TBD|Winter access notes/);
 assert.match(html,/>No</);
 assert.doesNotMatch(html,/>Utilities<|>Buildings &amp; Timeline</);
 const empty=renderToStaticMarkup(createElement(PropertyInfrastructure,{property:readDraft({...seeds[0],facts:{power:{state:'Not yet determined',value:null}}})}));
 assert.equal(empty,'');
});


test('public field projection hides empty sections without mutating staff content',()=>{
 const property=readDraft({...seeds[0],facts:{total_acres:{state:'Not yet determined',value:10},share_price:{state:'Actual',value:0},gated:{state:'Actual',value:false},existing_structures:{state:'Actual',value:'TBD'}},phases:[{id:'empty',name:'Empty phase',scope:'TBD',budget:{state:'Not yet determined',value:null},timeline:{state:'Not yet determined',value:null}}],sections:[{id:'empty',title:'Empty story',eyebrow:'',body:'',facts:[{label:'Size',value:'Not yet determined'}]}]});
 const original=structuredClone(property),visible=visiblePropertyFields(property);
 assert.deepEqual(Object.keys(visible.facts).sort(),['gated','share_price']);
 assert.equal(visible.phases.length,0);assert.equal(visible.sections.length,0);
 assert.deepEqual(property,original);
});

test('property page omits empty sections and their navigation links',()=>{
 const property=readDraft({...seeds[0],region:'',gallery:[],media:[],sections:[],phases:[{id:'empty',name:'Empty',scope:'',budget:{state:'Not yet determined',value:null},timeline:{state:'Not yet determined',value:null}}],facts:{existing_structures:{state:'Not yet determined',value:null},power:{state:'Not yet determined',value:null},total_acres:{state:'Not yet determined',value:null}},proximity:[]});
 const html=renderToStaticMarkup(createElement(PropertyPage,{property}));
 assert.doesNotMatch(html,/Not yet determined|TBD|href="#(?:structures|infrastructure|next|area|gallery)"|Area Details/);
});
