import test from 'node:test';
import assert from 'node:assert/strict';
import {uploadPropertyPhoto} from '../src/lib/photo-upload';
const id='00000000-0000-4000-8000-000000000001',file=new File(['synthetic'],'test.png');
test('photo upload aborts a stalled request and permits a successful retry',async()=>{
 const stalled:typeof fetch=async(_url,init)=>new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new Error('aborted'))));
 await assert.rejects(uploadPropertyPhoto(id,file,{fetcher:stalled,timeoutMs:5}),/timed out/);
 const success:typeof fetch=async(_url,init)=>{assert.equal((init?.body as FormData).get('propertyId'),id);return Response.json({id,url:`/api/property-photos/${id}`});};
 assert.equal((await uploadPropertyPhoto(id,file,{fetcher:success})).id,id);
});
test('photo upload exposes server errors and rejects malformed success responses',async()=>{
 for(const response of [Response.json({error:'Invalid upload origin.'},{status:403}),new Response('gateway error',{status:502}),Response.json({})])await assert.rejects(uploadPropertyPhoto(id,file,{fetcher:async()=>response}));
});
