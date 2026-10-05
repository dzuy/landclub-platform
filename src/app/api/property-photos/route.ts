import {z} from 'zod';
import {PHOTO_SIZE_LABEL} from '@/lib/photo-policy';
import {requireStaff,StaffAccessError} from '@/lib/staff';
import {database} from '@/lib/database';
import {store} from '@/lib/store';
import {MAX_PHOTO_BYTES,initializePhotoStorage,savePhoto} from '@/lib/property-photo-storage';
export const runtime='nodejs';
export async function POST(request:Request){
 try{
  await requireStaff();
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid upload origin.'},{status:403});
  const reader=request.body?.getReader();if(!reader)return Response.json({error:'No photo supplied.'},{status:400});
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_PHOTO_BYTES+65536){await reader.cancel();return Response.json({error:`Photo exceeds ${PHOTO_SIZE_LABEL}.`},{status:413});}chunks.push(value);}
  const form=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();
  const id=z.uuid().parse(form.get('propertyId')),file=form.get('file');
  if(!(file instanceof File))return Response.json({error:'Choose a photo.'},{status:400});
  if(!await (await store()).get(id))return Response.json({error:'Property not found.'},{status:404});
  const db=database();if(!process.env.DATABASE_URL&&process.env.NODE_ENV==='development')await initializePhotoStorage(db);
  const photo=await savePhoto(db,id,new Uint8Array(await file.arrayBuffer()),{originalFilename:file.name});
  return Response.json(photo);
 }catch(error){return Response.json({error:error instanceof StaffAccessError?'Please sign in as staff.':`Upload failed. Use a JPG, PNG, WebP or GIF up to ${PHOTO_SIZE_LABEL} and try again.`},{status:error instanceof StaffAccessError?403:400});}
}
