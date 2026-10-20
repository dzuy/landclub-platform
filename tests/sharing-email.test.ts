import test from 'node:test';
import assert from 'node:assert/strict';
import {sharingEmail,sharingMailConfig,sharingMailReady,sendSharingEmail} from '../src/lib/sharing-email';
const env={INVESTMENT_SHARING_MAIL_ENABLED:'true',RESEND_API_KEY:'mock-key',INVESTMENT_SHARING_FROM:'Land Club <sharing@example.test>',LAND_CLUB_SITE_URL:'https://app.example.test',NODE_ENV:'production'};
const mail={invitationId:'d7a3f088-dd4c-49a7-861c-2efaf0a58154',email:'recipient@example.test',token:'a'.repeat(43),accounts:['Property <A> & Equity']};
test('mail template uses exact recipient/scope, escaped HTML and configured acceptance route',()=>{
 const config=sharingMailConfig(env),message=sharingEmail(mail,config.site);
 assert.ok(message.text.includes('https://app.example.test/investment-access/accept?token='));assert.ok(message.text.includes(mail.email));
 assert.ok(message.html.includes('Property &lt;A&gt; &amp; Equity'));assert.ok(!message.html.includes('Property <A>'));assert.ok(message.text.includes('cannot edit or share'));
 assert.equal(sharingMailReady({...env,RESEND_API_KEY:''}),false);assert.equal(sharingMailReady({...env,INVESTMENT_SHARING_FROM:'bad\r\nBcc: x@example.test'}),false);
 assert.equal(sharingMailReady({...env,LAND_CLUB_SITE_URL:'http://127.0.0.1:3000'}),false);
 assert.equal(sharingMailConfig({...env,INVESTMENT_SHARING_SITE_URL:'https://sharing.example.test'}).site.origin,'https://sharing.example.test');
});
test('provider request uses a stable idempotency key, accepts only a receipt and never retries uncertain sends automatically',async()=>{
 const requests:RequestInit[]=[];const mock:typeof fetch=async(_url,init)=>{requests.push(init!);return new Response(JSON.stringify({id:'provider-receipt'}),{status:200});};
 await sendSharingEmail(mail,env,mock);await sendSharingEmail(mail,env,mock);
 assert.equal(new Headers(requests[0].headers).get('Idempotency-Key'),`investment-sharing/${mail.invitationId}`);assert.deepEqual(requests[0].body,requests[1].body);
 for(const response of [new Response('provider failed',{status:500}),new Response('{}',{status:200})])await assert.rejects(()=>sendSharingEmail(mail,env,async()=>response));
 let attempts=0;await assert.rejects(()=>sendSharingEmail(mail,env,async()=>{attempts++;throw new Error('timeout');}));assert.equal(attempts,1);
});
