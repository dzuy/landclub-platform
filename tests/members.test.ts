import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMemberDirectory,type AuthDirectoryUser} from '../src/lib/members';
import type {Invitation,UserRoleAssignment} from '../src/lib/invitations';

const invitation:Invitation={id:'invite-1',email:'member@example.com',roles:['member','investor'],status:'pending',authUserId:'user-1',invitedBy:'staff-1',failureReason:null,createdAt:'2026-09-23T12:00:00.000Z',sentAt:'2026-09-23T12:01:00.000Z',acceptedAt:null};

test('member directory combines auth activity, names, invitations, and multiple roles',()=>{
 const users:AuthDirectoryUser[]=[
  {id:'user-1',email:'member@example.com',created_at:'2026-09-23T12:00:00.000Z',user_metadata:{display_name:'Avery Morgan'}},
  {id:'staff-1',email:'staff@example.com',created_at:'2026-09-20T12:00:00.000Z',last_sign_in_at:'2026-09-24T08:00:00.000Z',email_confirmed_at:'2026-09-20T12:02:00.000Z',user_metadata:{}},
 ];
 const assignments:UserRoleAssignment[]=[{userId:'user-1',role:'member'},{userId:'user-1',role:'investor'}];
 const members=buildMemberDirectory(users,[invitation],assignments,'staff-1');
 assert.deepEqual(members[0],{id:'user-1',name:'Avery Morgan',email:'member@example.com',roles:['member','investor'],status:'invited',joinedAt:'2026-09-23T12:00:00.000Z',lastActiveAt:null,roleTarget:{kind:'invitation',id:'invite-1'},rolesLocked:false});
 assert.equal(members[1].roles[0],'admin');
 assert.equal(members[1].rolesLocked,true);
 assert.equal(members[1].status,'active');
 assert.equal(members[1].lastActiveAt,'2026-09-24T08:00:00.000Z');
});

test('member directory falls back to invitation records when auth administration is unavailable',()=>{
 const members=buildMemberDirectory([], [invitation], [], undefined);
 assert.equal(members.length,1);
 assert.equal(members[0].email,'member@example.com');
 assert.deepEqual(members[0].roles,['member','investor']);
 assert.equal(members[0].status,'invited');
 assert.deepEqual(members[0].roleTarget,{kind:'invitation',id:'invite-1'});
});
