import test from 'node:test';
import assert from 'node:assert/strict';
import {invitationMessageSchema,invitationMessageData} from '../src/lib/invitation-message';

test('optional invitation messages omit the email block when blank',()=>{
 assert.deepEqual(invitationMessageData(invitationMessageSchema.parse(' \n ')),{land_club_invitation_message_lines:[]});
});
test('invitation messages preserve paragraphs and normalize line endings',()=>{
 const message=invitationMessageSchema.parse(' Welcome!\r\n\r\nSee you soon. ');
 assert.deepEqual(invitationMessageData(message).land_club_invitation_message_lines,['Welcome!','','See you soon.']);
});
test('invitation messages reject invalid input and oversized messages before sending',()=>{
 assert.equal(invitationMessageSchema.safeParse('a'.repeat(2000)).success,true);
 assert.equal(invitationMessageSchema.safeParse('a'.repeat(2001)).success,false);
 assert.equal(invitationMessageSchema.safeParse({text:'Welcome'}).success,false);
});
