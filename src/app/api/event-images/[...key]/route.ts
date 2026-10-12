import {requireMember,MemberAccessError} from '@/lib/staff';
import {photoStorage,validateObjectKey} from '@/lib/photo-object-storage';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{key:string[]}>}){
 try{await requireMember();const key=validateObjectKey((await params).key.join('/'));const bytes=await photoStorage().get(key);return new Response(Buffer.from(bytes),{headers:{'Content-Type':'image/webp','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});}
 catch(error){return new Response(null,{status:error instanceof MemberAccessError?403:404});}
}
