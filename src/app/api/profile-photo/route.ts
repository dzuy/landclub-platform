import {authClient} from '@/lib/auth/client';
import {clubUserAuthorized} from '@/lib/staff';
import {photoStorage} from '@/lib/photo-object-storage';
import {profilePhotoKey,profilePhotoUrl,MAX_PROFILE_PHOTO_BYTES} from '@/lib/profile-photo';
import {saveProfilePhoto} from '@/lib/profile-photo-storage';
import {hasSameOrigin} from '@/lib/request-origin';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const client=await authClient(),{data:{user},error}=await client.auth.getUser();
  if(error||!user||!await clubUserAuthorized(user))return new Response(null,{status:401});
  const key=profilePhotoKey(user.id,user.user_metadata);
  if(!key)return new Response(null,{status:404});
  return new Response(Buffer.from(await photoStorage().get(key)),{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response(null,{status:503});}
}
export async function POST(request:Request){
 if(!hasSameOrigin(request))return Response.json({error:'Invalid upload origin.'},{status:403});
 try{
  const client=await authClient(),{data:{user},error}=await client.auth.getUser();
  if(error||!user||!await clubUserAuthorized(user))return Response.json({error:'Sign in to upload your profile photo.'},{status:401});
  const reader=request.body?.getReader();if(!reader)return Response.json({error:'Choose a photo.'},{status:400});
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_PROFILE_PHOTO_BYTES+65536){await reader.cancel();return Response.json({error:'Choose a photo under 10 MiB.'},{status:413});}chunks.push(value);}
  const form=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();
  const file=form.get('file');if(!(file instanceof File))return Response.json({error:'Choose a photo.'},{status:400});
  const key=await saveProfilePhoto(user.id,new Uint8Array(await file.arrayBuffer()),photoStorage());
  const {error:saveError}=await client.auth.updateUser({data:{land_club_avatar:key}});
  if(saveError)return Response.json({error:'Your photo could not be saved. Please try again.'},{status:503});
  return Response.json({url:profilePhotoUrl(user.id,{land_club_avatar:key})});
 }catch{return Response.json({error:'Upload failed. Choose a JPG, PNG, WebP or GIF under 10 MiB and try again.'},{status:400});}
}
