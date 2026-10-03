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

test('infrastructure keeps unknown, planned and false values visible',()=>{
 const property=readDraft({...seeds[0],facts:{road_access:{value:'gravel',state:'Planned',notes:'Awaiting approval.'},winter_access_notes:{value:null,state:'Not yet determined'},gated:{value:false,state:'Actual'}}});
 const html=renderToStaticMarkup(createElement(PropertyInfrastructure,{property}));
 assert.match(html,/gravel \(planned\)/);
 assert.match(html,/Awaiting approval\./);
 assert.match(html,/Not yet determined/);
 assert.match(html,/>No</);
 assert.doesNotMatch(html,/>Utilities<|>Buildings &amp; Timeline</);
 const empty=renderToStaticMarkup(createElement(PropertyInfrastructure,{property:readDraft({...seeds[0],facts:{}})}));
 assert.equal(empty,'');
});
