import test from 'node:test';
import assert from 'node:assert/strict';
import {hasSameOrigin} from '../src/lib/request-origin';
test('uses browser Host when Next has an internal localhost URL',()=>{
 assert.equal(hasSameOrigin(new Request('http://localhost:3000/api/member-documents',{headers:{Host:'127.0.0.1:3000',Origin:'http://127.0.0.1:3000'}})),true);
 assert.equal(hasSameOrigin(new Request('https://internal/api/member-documents',{headers:{Host:'club.example',Origin:'https://club.example'}})),true);
});
test('rejects missing, malformed, cross-site and spoofed forwarded origins',()=>{
 for(const origin of ['https://evil.example','http://127.0.0.1:3001','null','http://127.0.0.1:3000/anything','https://127.0.0.1:3000','']){
  assert.equal(hasSameOrigin(new Request('http://localhost:3000/api/member-documents',{headers:{Host:'127.0.0.1:3000',Origin:origin,'X-Forwarded-Host':'evil.example'}})),false);
 }
 assert.equal(hasSameOrigin(new Request('http://localhost:3000/api/member-documents',{headers:{Origin:'http://localhost:3000'}})),false);
});
