import {z} from 'zod';
import {hasSameOrigin} from '@/lib/request-origin';
import {groupDocumentStore} from '@/lib/group-document-store';
import {memberDocumentStore} from '@/lib/member-document-store';
import {MAX_DOCUMENT_BYTES,documentTagsSchema,validateDocument} from '@/lib/member-documents';
import {documentActor,documentJson,limitedBody} from '@/lib/member-document-http';
import {managedMember} from '@/lib/managed-member';
import {preparedMemberStore} from '@/lib/prepared-member-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const actor=await documentActor();if(!actor)return documentJson({error:'Please sign in.'},401);
 const requested=new URL(request.url).searchParams.get('memberId');
 if(requested&&!actor.admin&&requested!==actor.id)return documentJson({error:'Not found.'},404);
 const id=requested||actor.id;
 if(requested&&!z.uuid().safeParse(id).success)return documentJson({error:'Invalid member.'},400);
 try{
  const personal=z.uuid().safeParse(id).success?await (await memberDocumentStore()).list(id,actor):[];
  const groups=requested?[]:await (await groupDocumentStore()).listForMember(actor);
  const documents=[...personal,...groups.map(doc=>({...doc,group:true,member_id:''}))].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
  return documentJson({documents});
 }catch{return documentJson({error:'Unable to load documents. Please try again.'},500);}
}
export async function POST(request:Request){
 const actor=await documentActor();if(!actor?.admin)return documentJson({error:'Admin access required.'},403);
 if(!hasSameOrigin(request))return documentJson({error:'Invalid upload origin.'},403);
 try{
  let bytes:Buffer;try{bytes=await limitedBody(request,MAX_DOCUMENT_BYTES+65536);}catch{return documentJson({error:'Choose a file up to 20 MB.'},413);}
  const form=await new Response(new Uint8Array(bytes),{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();
  const memberId=z.uuid().parse(form.get('memberId')),file=form.get('file');
  if(!(file instanceof File))return documentJson({error:'Choose a document.'},400);
  const tags=documentTagsSchema.parse(JSON.parse(String(form.get('tags')||'[]')));
  const content=new Uint8Array(await file.arrayBuffer());
  try{validateDocument(file.name,content);}catch(error){return documentJson({error:(error as Error).message},400);}
  const prepared=await (await preparedMemberStore()).get(memberId);
  if(!prepared)await managedMember(memberId);
  const document=await (await memberDocumentStore()).upload(memberId,file.name,content,tags,actor);
  return documentJson({document},201);
 }catch{return documentJson({error:'Upload failed. Check the file, tags and member, then try again.'},400);}
}
