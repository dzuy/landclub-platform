import {hasSameOrigin} from '@/lib/request-origin';
import {groupDocumentStore} from '@/lib/group-document-store';
import {MAX_DOCUMENT_BYTES,validateDocument} from '@/lib/member-documents';
import {documentActor,documentJson,limitedBody} from '@/lib/member-document-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){const actor=await documentActor();if(!actor?.admin)return documentJson({error:'Admin access required.'},403);try{return documentJson({documents:await (await groupDocumentStore()).listAdmin(actor)});}catch{return documentJson({error:'Unable to load documents.'},500);}}
export async function POST(request:Request){
 const actor=await documentActor();if(!actor?.admin)return documentJson({error:'Admin access required.'},403);
 if(!hasSameOrigin(request))return documentJson({error:'Invalid upload origin.'},403);
 try{
  let bytes:Buffer;try{bytes=await limitedBody(request,MAX_DOCUMENT_BYTES+65536);}catch{return documentJson({error:'Choose a file up to 20 MB.'},413);}
  const form=await new Response(new Uint8Array(bytes),{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();
  const file=form.get('file');if(!(file instanceof File))return documentJson({error:'Choose a document.'},400);
  const content=new Uint8Array(await file.arrayBuffer());try{validateDocument(file.name,content);}catch(error){return documentJson({error:(error as Error).message},400);}
  const document=await (await groupDocumentStore()).upload(file.name,content,JSON.parse(String(form.get('tags')||'[]')),JSON.parse(String(form.get('audience')||'null')),actor);
  return documentJson({document},201);
 }catch{return documentJson({error:'Upload failed. Check the file and choose a valid audience, then try again.'},400);}
}
