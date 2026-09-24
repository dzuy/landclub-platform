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
 await repository.accept('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333');
 assert.equal(await repository.hasRole('33333333-3333-3333-3333-333333333333','owner'),true);assert.equal(await repository.hasRole('33333333-3333-3333-3333-333333333333','admin'),false);
 await db.close();
});
