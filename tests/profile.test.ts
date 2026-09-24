import test from 'node:test';
import assert from 'node:assert/strict';
import {profileSchema,readProfile,profileMetadata} from '../src/lib/profile';

test('profile defaults never opt users into communications',()=>{
 assert.deepEqual(readProfile({}),{displayName:'',homeRegion:'',propertyUpdates:false,clubEvents:false,newPlaces:false});
 assert.equal(readProfile({land_club_preferences:{clubEvents:'true'}}).clubEvents,false);
});
test('profile validates input and cannot write access fields',()=>{
 const result=profileSchema.parse({displayName:'  Alex  ',homeRegion:' Oregon ',propertyUpdates:true,clubEvents:false,newPlaces:true,role:'admin',email:'other@example.com'});
 assert.deepEqual(profileMetadata(result),{display_name:'Alex',home_region:'Oregon',land_club_preferences:{propertyUpdates:true,clubEvents:false,newPlaces:true}});
 assert.equal(profileSchema.safeParse({...result,displayName:'  '}).success,false);
 assert.equal(profileSchema.safeParse({...result,clubEvents:'true'}).success,false);
 assert.equal(profileSchema.safeParse({...result,homeRegion:'a'.repeat(101)}).success,false);
 assert.deepEqual(readProfile(profileMetadata(result)),result);
});
