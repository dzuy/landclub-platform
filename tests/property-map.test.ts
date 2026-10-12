import test from 'node:test';
import assert from 'node:assert/strict';
import {validMapPoint,distanceKm,matchesPlace,mapSearchName} from '../src/lib/property-map';
import {proximitySchema} from '../src/lib/property-facts';
test('map coordinates reject invalid values and preserve zero',()=>{
 assert.equal(validMapPoint({latitude:0,longitude:0}),true);
 for(const v of [null,{latitude:91,longitude:0},{latitude:0,longitude:181},{latitude:NaN,longitude:0}])assert.equal(validMapPoint(v),false);
});
test('map matching handles airport codes and rejects unrelated search results',()=>{
 assert.equal(mapSearchName('Reno-Tahoe International Airport (RNO)'),'Reno Tahoe International Airport');
 assert.equal(matchesPlace('Reno-Tahoe International Airport (RNO)','Reno–Tahoe International Airport'),true);
 assert.equal(matchesPlace('Royal Gorge','Donner Summit Canyon'),false);
 assert.ok(distanceKm({latitude:39.3159,longitude:-120.35494},{latitude:38.431,longitude:-105.268})>500);
});
test('nearby coordinates are optional for old records and validated when supplied',()=>{
 const p={id:'town',name:'Truckee',kind:'town',minutes:{state:'Actual',value:13},miles:{state:'Not yet determined',value:null}};
 assert.equal(proximitySchema.safeParse(p).success,true);
 assert.equal(proximitySchema.safeParse({...p,coordinates:{latitude:39.3,longitude:-120.2}}).success,true);
 assert.equal(proximitySchema.safeParse({...p,coordinates:{latitude:999,longitude:-120.2}}).success,false);
});

test('property fallback searches include county context and ignore unknown location fields',async()=>{
 const {propertyLocationQueries}=await import('../src/lib/property-map');
 const facts={county:{state:'Actual' as const,value:'Humboldt'},state:{state:'Actual' as const,value:'California'},country:{state:'Actual' as const,value:'United States'}};
 const queries=propertyLocationQueries({name:'Shelter Cove',region:'',facts});
 assert.equal(queries[0].query,'Shelter Cove, Humboldt, California, United States');
 assert.equal(queries[1].query,'Humboldt, California, United States');
 assert.equal(queries[2].query,'California, United States');
 assert.deepEqual(propertyLocationQueries({name:'Unnamed',region:'TBD',facts:{county:{state:'Not yet determined',value:null}}}),[]);
 const region=propertyLocationQueries({name:'Example',region:'Norden',facts});
 assert.equal(region[1].query,'Norden, Humboldt, California, United States');
});
