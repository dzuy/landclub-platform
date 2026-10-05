import {z} from 'zod';
import {hasSameOrigin} from '@/lib/request-origin';
import {memberDocumentStore} from '@/lib/member-document-store';
import {documentActor,documentJson,limitedBody,privateHeaders} from '@/lib/member-document-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await documentActor();if(!actor)return documentJson({error:'Please sign in.'},401);
 const {id}=await params;if(!z.uuid().safeParse(id).success)return documentJson({error:'Not found.'},404);
 try{
  const doc=await (await memberDocumentStore()).download(id,actor);if(!doc)return documentJson({error:'Not found.'},404);
  return new Response(Buffer.from(doc.content,'base64'),{headers:{...privateHeaders,'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(doc.filename).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16))}`,'Content-Security-Policy':"sandbox; default-src 'none'"}});
 }catch{return documentJson({error:'Unable to download this document.'},500);}
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await documentActor();if(!actor?.admin)return documentJson({error:'Admin access required.'},403);
 if(!hasSameOrigin(request))return documentJson({error:'Invalid request origin.'},403);
 try{
  const {id}=await params;const input=JSON.parse((await limitedBody(request,16384)).toString());
  const document=await (await memberDocumentStore()).updateTags(id,input.version,input.tags,actor);return documentJson({document});
 }catch{return documentJson({error:'Tags could not be saved. Refresh and try again.'},400);}
}
