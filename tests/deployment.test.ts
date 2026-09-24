import test from 'node:test';
import assert from 'node:assert/strict';
import {isStaffUser} from '../src/lib/auth/policy';
// Deployment scripts also run directly in the minimal production image.
import {validateEnvironment} from '../scripts/check-environment.mjs';
test('hosted staff must be explicitly allowed and have a confirmed email',()=>{
 const user={id:'staff-1',email_confirmed_at:'2026-09-23'};
 assert.equal(isStaffUser(user,'staff-1,staff-2'),true);
 assert.equal(isStaffUser(user,'staff-11'),false);
 assert.equal(isStaffUser(user,undefined),false);
 assert.equal(isStaffUser({...user,email_confirmed_at:null},'staff-1'),false);
 assert.equal(isStaffUser({...user,is_anonymous:true},'staff-1'),false);
 assert.equal(isStaffUser(null,'staff-1'),false);
});
test('deployment rejects missing config and local bypass',()=>{
 const env={DATABASE_URL:'postgresql://test:example@localhost/test',SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test',STAFF_USER_IDS:'00000000-0000-0000-0000-000000000001',LAND_CLUB_SITE_URL:'https://land.example'};
 assert.doesNotThrow(()=>validateEnvironment(env));
 assert.throws(()=>validateEnvironment({...env,DATABASE_URL:''}));
 assert.throws(()=>validateEnvironment({...env,LAND_CLUB_LOCAL_STAFF:'1'}));
 assert.throws(()=>validateEnvironment({...env,SUPABASE_URL:'http://example.com'}));
 assert.throws(()=>validateEnvironment({...env,LAND_CLUB_SITE_URL:'http://land.example'}));
 assert.throws(()=>validateEnvironment({...env,STAFF_USER_IDS:'anyone'}));
});
