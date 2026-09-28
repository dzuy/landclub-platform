import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {InvitationRepository} from '../src/lib/invitations';
import {readRoles} from '../src/lib/roles';

test('roles are multi-select and default to member',()=>{
 assert.deepEqual(readRoles([]),['member']);
 assert.deepEqual(readRoles(['owner','investor','owner','not-a-role']),['owner','investor']);
});

test('invitations bind roles to the invited auth user',async()=>{
 const db=new PGlite(),repository=new InvitationRepository(embeddedDatabase(db));await repository.initialize();
 await repository.begin('11111111-1111-1111-1111-111111111111','person@example.com',['member','owner'],'staff-1');
 await assert.rejects(repository.begin('22222222-2222-2222-2222-222222222222','PERSON@example.com',['member'],'staff-1'));
 await repository.markPending('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333');
 assert.equal((await repository.pendingForUser('33333333-3333-3333-3333-333333333333','person@example.com'))?.email,'person@example.com');
 assert.equal(await repository.pendingForUser('33333333-3333-3333-3333-333333333333','other@example.com'),null);
 await repository.updatePendingRoles('11111111-1111-1111-1111-111111111111',['member','investor']);
 await repository.accept('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333');
 assert.equal(await repository.hasRole('33333333-3333-3333-3333-333333333333','investor'),true);assert.equal(await repository.hasRole('33333333-3333-3333-3333-333333333333','admin'),false);
 assert.deepEqual(await repository.rolesForUser('33333333-3333-3333-3333-333333333333'),['member','investor']);
 await repository.replaceUserRoles('33333333-3333-3333-3333-333333333333',['prospect','admin'],'staff-2');
 assert.deepEqual(await repository.rolesForUser('33333333-3333-3333-3333-333333333333'),['prospect','admin']);
 assert.equal(await repository.hasRole('33333333-3333-3333-3333-333333333333','member'),false);
 await db.close();
});

test('cancelling an active invitation releases the email for a replacement',async()=>{
 const db=new PGlite(),repository=new InvitationRepository(embeddedDatabase(db));await repository.initialize();
 const firstId='44444444-4444-4444-4444-444444444444';
 await repository.begin(firstId,'returning@example.com',['member'],'staff-1');
 await repository.markPending(firstId,'55555555-5555-5555-5555-555555555555');
 assert.equal((await repository.activeById(firstId))?.email,'returning@example.com');
 const cancelled=await repository.cancel(firstId,'staff-1');
 assert.equal(cancelled.status,'failed');
 assert.equal(cancelled.failureReason,'Cancelled by staff-1');
 assert.equal(await repository.activeById(firstId),null);
 await repository.begin('66666666-6666-6666-6666-666666666666','RETURNING@example.com',['prospect'],'staff-1');
 await assert.rejects(repository.cancel(firstId,'staff-1'));
 await db.close();
});
