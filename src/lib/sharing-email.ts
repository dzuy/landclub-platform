import {z} from 'zod';
import type {SharingMail} from './investment-sharing';
import {canonicalSiteUrl} from './auth/recovery';
type MailEnvironment={INVESTMENT_SHARING_MAIL_ENABLED?:string;RESEND_API_KEY?:string;INVESTMENT_SHARING_FROM?:string;INVESTMENT_SHARING_SITE_URL?:string;LAND_CLUB_SITE_URL?:string;NODE_ENV?:string};
export function sharingMailConfig(env:MailEnvironment){
 if(env.INVESTMENT_SHARING_MAIL_ENABLED!=='true'||!env.RESEND_API_KEY||!env.INVESTMENT_SHARING_FROM)throw new Error('Sharing email delivery is not configured.');
 const from=env.INVESTMENT_SHARING_FROM.trim(),address=from.match(/<([^<>]+)>$/)?.[1]??from;
 if(/[\r\n]/.test(from)||!z.email().safeParse(address).success)throw new Error('Sharing sender is invalid.');
 const site=canonicalSiteUrl(null,env.INVESTMENT_SHARING_SITE_URL||env.LAND_CLUB_SITE_URL,env.NODE_ENV);
 if(site.username||site.password||site.protocol!=='https:')throw new Error('Sharing requires a public HTTPS acceptance URL.');
 if(['localhost','127.0.0.1','[::1]'].includes(site.hostname))throw new Error('Sharing requires a public HTTPS acceptance URL.');
 return {from,site,apiKey:env.RESEND_API_KEY};
}
export function sharingMailReady(env:MailEnvironment){try{sharingMailConfig(env);return true;}catch{return false;}}
const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function sharingEmail(mail:SharingMail,site:URL){
 if(!z.uuid().safeParse(mail.invitationId).success||!z.email().safeParse(mail.email).success||!/^[A-Za-z0-9_-]{43}$/.test(mail.token)||!mail.accounts.length)throw new Error('Invalid sharing email.');
 const url=new URL('/investment-access/accept',site);url.searchParams.set('token',mail.token);
 const text=`You’ve been invited to view these Land Club investments:\n\n${mail.accounts.join('\n')}\n\nRead-only access to released reports and their documents. You cannot edit or share this access onward.\n\nSign in with ${mail.email} and accept your invitation:\n${url}\n\nThis invitation expires in 7 days. If you don’t have an account, contact Land Club for access.`;
 const html=`<div style="font-family:Arial,sans-serif;color:#172113;max-width:560px;margin:auto"><h1 style="font-size:28px">Land Club</h1><h2 style="font-size:22px">View shared investments</h2><ul>${mail.accounts.map(a=>`<li>${escape(a)}</li>`).join('')}</ul><p>Read-only access to released reports and their documents. You cannot edit or share this access onward.</p><p><a href="${escape(url.toString())}">Review invitation</a></p><p>Sign in with ${escape(mail.email)}. This invitation expires in 7 days.</p><p>If you don’t have an account, contact Land Club for access.</p></div>`;
 return {subject:'Land Club · Investment invitation',text,html};
}
export async function sendSharingEmail(mail:SharingMail,env:MailEnvironment,send:typeof fetch=fetch){
 const config=sharingMailConfig(env),message=sharingEmail(mail,config.site);
 const response=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json','Idempotency-Key':`investment-sharing/${mail.invitationId}`},body:JSON.stringify({from:config.from,to:[mail.email],...message}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Sharing email delivery could not be confirmed.');
 const receipt:unknown=await response.json();
 if(!receipt||typeof receipt!=='object'||!('id' in receipt)||typeof receipt.id!=='string'||!receipt.id)throw new Error('Sharing email delivery could not be confirmed.');
 // Provider acceptance is not an inbox-delivery receipt. Never log tokens or keys.
}
