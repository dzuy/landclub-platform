import 'server-only';
import {cache} from 'react';
import {authClient} from './client';
import {authConfigured} from './policy';
export const currentUser=cache(async()=>{
 if(!authConfigured())return null;
 try{const {data:{user},error}=await (await authClient()).auth.getUser();return error?null:user;}catch{return null;}
});
