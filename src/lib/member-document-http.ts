import 'server-only';
import {clubIdentity} from './staff';
import {currentUser} from './auth/identity';
export const privateHeaders={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
export function documentJson(body:unknown,status=200){return Response.json(body,{status,headers:privateHeaders});}
export async function documentActor(){const actor=await clubIdentity();if(!actor)return null;const user=await currentUser();return {...actor,id:user?.id||actor.id};}
export async function limitedBody(request:Request,limit:number){
 const reader=request.body?.getReader();if(!reader)throw new Error('Missing body');
 const chunks:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('Body too large');}chunks.push(value);}
 return Buffer.concat(chunks);
}
