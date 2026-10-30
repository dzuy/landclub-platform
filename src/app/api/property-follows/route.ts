import {z} from 'zod';
import {clubIdentity} from '@/lib/staff';
import {readFollowRequest} from '@/lib/property-follow-request';
import {propertyFollowStore} from '@/lib/property-follow-store';
import {propertyFollowCatalog} from '@/lib/property-follow-catalog';
import {PropertyFollowError} from '@/lib/property-follows';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){
 const actor=await clubIdentity();if(!actor||actor.preview?.expired)return json({error:'Please sign in.'},401);
 try{return json({properties:await propertyFollowCatalog(actor.id)});}catch{return json({error:'Unable to load properties. Please try again.'},500);}
}
export async function PUT(request:Request){
 const actor=await clubIdentity();if(!actor||actor.preview?.expired)return json({error:'Please sign in.'},401);
 try{
  const input=await readFollowRequest(request,actor);
  await (await propertyFollowStore()).set(actor,input.propertyId,input.following);
  return json({properties:await propertyFollowCatalog(actor.id)});
 }catch(error){return json({error:error instanceof PropertyFollowError?error.message:error instanceof z.ZodError||error instanceof SyntaxError?'Invalid follow request.':'Unable to update following. Please try again.'},error instanceof PropertyFollowError?error.status:error instanceof z.ZodError||error instanceof SyntaxError?400:500);}
}
