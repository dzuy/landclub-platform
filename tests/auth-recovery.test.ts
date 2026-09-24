import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalSiteUrl,newPasswordSchema,recoveryRedirectUrl} from '../src/lib/auth/recovery';

test('password recovery requires matching passwords of at least eight characters',()=>{
 assert.equal(newPasswordSchema.safeParse({password:'long-enough',confirmPassword:'long-enough'}).success,true);
 assert.equal(newPasswordSchema.safeParse({password:'short',confirmPassword:'short'}).success,false);
 assert.equal(newPasswordSchema.safeParse({password:'long-enough',confirmPassword:'different'}).success,false);
});

test('password recovery builds a fixed callback on the canonical site',()=>{
 assert.equal(recoveryRedirectUrl('https://request.example','https://land.example/base','production'),'https://land.example/auth/callback');
 assert.equal(canonicalSiteUrl('http://0.0.0.0:8080/path','https://land.example/base','production').toString(),'https://land.example/');
 assert.equal(recoveryRedirectUrl('http://localhost:3000',undefined,'development'),'http://localhost:3000/auth/callback');
 assert.throws(()=>recoveryRedirectUrl('https://request.example',undefined,'production'));
 assert.throws(()=>recoveryRedirectUrl('http://land.example',undefined,'production'));
 assert.throws(()=>recoveryRedirectUrl('javascript:alert(1)',undefined,'development'));
});
