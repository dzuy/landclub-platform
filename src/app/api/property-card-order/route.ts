import {clubIdentity} from '@/lib/staff';
import {database} from '@/lib/database';
import {memberPropertyDetails} from '@/lib/member-property-access';
import {hasSameOrigin} from '@/lib/request-origin';
import {limitedBody} from '@/lib/member-document-http';
import {CardOrderConflict,PropertyCardPreferences,cardOrderInput} from '@/lib/property-card-preferences';

export const runtime='nodejs';
export const dynamic='force-dynamic';
function json(body:unknown,status=200){return Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});}
async function preferences(){
 const db=database();
 if(!process.env.DATABASE_URL&&process.env.NODE_ENV==='development'){
  await db.query("CREATE TABLE IF NOT EXISTS member_property_card_order (user_id text PRIMARY KEY,property_ids jsonb NOT NULL DEFAULT '[]'::jsonb,version integer NOT NULL DEFAULT 1,updated_at timestamptz NOT NULL DEFAULT now())");
 }
 return new PropertyCardPreferences(db);
}
export async function GET(){
 const actor=await clubIdentity();if(!actor||actor.preview?.expired)return json({error:'Please sign in.'},401);
 try{return json({...await (await preferences()).read(actor.id),readOnly:!!actor.preview});}
 catch{return json({error:'Unable to load your property order. Try again.'},500);}
}
export async function PUT(request:Request){
 const actor=await clubIdentity();if(!actor||actor.preview?.expired)return json({error:'Please sign in.'},401);
 if(actor.preview)return json({error:'Exit View as before changing a member’s preferences.'},403);
 if(!hasSameOrigin(request))return json({error:'Invalid request origin.'},403);
 try{
  const parsed=cardOrderInput.safeParse(JSON.parse((await limitedBody(request,65536)).toString()));
  if(!parsed.success)return json({error:'Invalid property order.'},400);
  const allowed=await memberPropertyDetails(actor.id);
  if(parsed.data.order.some(id=>!allowed.some(p=>p.id===id)))return json({error:'Property access changed. Refresh the page.'},403);
  return json(await (await preferences()).save(actor.id,parsed.data,allowed.map(p=>p.id)));
 }catch(error){
  if(error instanceof CardOrderConflict)return json({error:'Your order changed on another device. Reload its order or retry to keep this order.'},409);
  return json({error:'Unable to save your property order. Please retry.'},500);
 }
}
