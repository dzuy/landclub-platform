import {z} from 'zod';

export const newPasswordSchema=z.object({
 password:z.string().min(8).max(1024),
 confirmPassword:z.string().min(1).max(1024),
}).refine(value=>value.password===value.confirmPassword,{path:['confirmPassword']});

export function canonicalSiteUrl(requestOrigin:string|null,configuredSiteUrl:string|undefined,nodeEnv:string|undefined){
 const configured=configuredSiteUrl?.trim();
 if(nodeEnv==='production'&&!configured)throw new Error('LAND_CLUB_SITE_URL is required in production.');
 const base=configured||requestOrigin;
 if(!base)throw new Error('The application URL is unavailable.');
 const url=new URL(base);
 if(!['http:','https:'].includes(url.protocol)||(nodeEnv==='production'&&url.protocol!=='https:'))throw new Error('The application URL is invalid.');
 url.pathname='/';
 url.search='';
 url.hash='';
 return url;
}

export function recoveryRedirectUrl(requestOrigin:string|null,configuredSiteUrl:string|undefined,nodeEnv:string|undefined){
 const url=canonicalSiteUrl(requestOrigin,configuredSiteUrl,nodeEnv);
 url.pathname='/auth/callback';
 return url.toString();
}
