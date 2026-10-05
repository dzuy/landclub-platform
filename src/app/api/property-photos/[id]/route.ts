import {z} from 'zod';
import {database} from '@/lib/database';
import {staffIdentity} from '@/lib/staff';
import {store} from '@/lib/store';
import {readPhoto,mayReadPhoto,type StoredPhoto} from '@/lib/property-photo-storage';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!z.uuid().safeParse(id).success)return new Response(null,{status:404});
 const url='/api/property-photos/'+id;
 const published=(await (await store()).publicList()).some(p=>p.hero===url||p.gallery.some(g=>g.src===url)||p.media.some(m=>m.url===url));
 const photo=(await database().query<StoredPhoto>('SELECT * FROM property_photos WHERE id=$1',[id])).rows[0];
 if(!photo)return new Response(null,{status:404});
 if(!mayReadPhoto(photo,false,published)&&!await staffIdentity())return new Response(null,{status:404});
 return new Response(Buffer.from(await readPhoto(photo)),{headers:{'Content-Type':photo.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
