import {z} from 'zod';
import {hasSameOrigin} from './request-origin';
import {PropertyFollowError,type FollowActor} from './property-follows';
export async function readFollowRequest(request:Request,actor:FollowActor|null){
 if(!actor?.id)throw new PropertyFollowError('Please sign in.',401);
 if(actor.preview)throw new PropertyFollowError('Following is read-only in View as. Exit the preview to make changes.',403);
 if(!hasSameOrigin(request))throw new PropertyFollowError('Invalid request origin.',403);
 const reader=request.body?.getReader();if(!reader)throw new PropertyFollowError('Invalid follow request.',400);
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();throw new PropertyFollowError('Invalid follow request.',400);}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return z.object({propertyId:z.uuid(),following:z.boolean()}).strict().parse(JSON.parse(new TextDecoder().decode(bytes)));
}
