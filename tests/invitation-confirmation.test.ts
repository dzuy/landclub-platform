import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmInvitationLink} from '../src/lib/auth/invitation-confirmation';

const input={tokenHash:'test-only-token',type:'invite'};
function fixture(){
 const calls:string[]=[];
 const deps={prepare:async()=>{calls.push('prepare');},verify:async(token:string)=>{assert.equal(token,input.tokenHash);calls.push('verify');return {user:{id:'invited-user',email:'recipient@example.com'},error:null} as {user:{id:string;email?:string}|null;error:{code?:string;status?:number}|null};},isPending:async(id:string,email:string)=>{assert.equal(id,'invited-user');assert.equal(email,'recipient@example.com');calls.push('pending');return true;},signOut:async()=>{calls.push('signout');}};
 return {calls,deps};
}
test('confirmation rejects malformed links before using auth or the database',async()=>{
 const {calls,deps}=fixture();
 for(const bad of [{...input,type:'recovery'},{...input,tokenHash:''},{...input,tokenHash:['one','two']},{}])assert.match((await confirmInvitationLink(bad,deps)).error,/incomplete or invalid/);
 assert.deepEqual(calls,[]);
});
test('only a verified identity with a pending invitation may proceed',async()=>{
 const {calls,deps}=fixture();
 assert.deepEqual(await confirmInvitationLink(input,deps),{error:''});
 assert.deepEqual(calls,['prepare','verify','pending']);
});
test('expired or used tokens are distinguished from provider outages',async()=>{
 const {deps}=fixture();
 deps.verify=async()=>({user:null,error:{code:'otp_expired',status:403}});
 assert.match((await confirmInvitationLink(input,deps)).error,/expired or has already been used/);
 deps.verify=async()=>({user:null,error:{status:503}});
 assert.match((await confirmInvitationLink(input,deps)).error,/temporarily unavailable/);
 deps.verify=async()=>({user:null,error:{status:429}});
 assert.match((await confirmInvitationLink(input,deps)).error,/temporarily unavailable/);
});
test('a missing pending invitation clears the newly verified session',async()=>{
 const {calls,deps}=fixture();deps.isPending=async()=>false;
 assert.match((await confirmInvitationLink(input,deps)).error,/no longer pending/);
 assert.deepEqual(calls,['prepare','verify','signout']);
});
test('database outage before verification does not consume the token',async()=>{
 const {calls,deps}=fixture();deps.prepare=async()=>{throw new Error('offline');};
 assert.match((await confirmInvitationLink(input,deps)).error,/temporarily unavailable/);
 assert.deepEqual(calls,[]);
});
test('failure after verification is not mislabeled as expiration',async()=>{
 const {calls,deps}=fixture();deps.isPending=async()=>{throw new Error('offline');};
 assert.match((await confirmInvitationLink(input,deps)).error,/link was verified/);
 assert.equal(calls.at(-1),'signout');
});
