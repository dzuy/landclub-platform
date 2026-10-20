import 'server-only';
import {cookies} from 'next/headers';
import {cache} from 'react';
import {investorPlatformStore} from './investor-platform-store';
import {database} from './database';
import {previewMemberIdentity} from './dashboard-preview-identity';
export const PREVIEW_COOKIE='land-club-dashboard-preview';
export async function hasDashboardPreview(){return (await cookies()).has(PREVIEW_COOKIE);}
export const dashboardPreview=cache(async (actor:{id:string;admin:boolean})=>{
 const token=(await cookies()).get(PREVIEW_COOKIE)?.value;if(!token)return null;
 if(!actor.admin)return {valid:false as const};
 const ctx=await (await investorPlatformStore()).preview(token,actor);if(!ctx)return {valid:false as const};
 const identity=await previewMemberIdentity(database(),ctx.person);
 return identity?{...ctx,...identity,valid:true as const}:{valid:false as const};
});
