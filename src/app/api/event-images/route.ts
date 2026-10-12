import {requireStaff,StaffAccessError} from '@/lib/staff';
import {saveEventImage} from '@/lib/event-images';
import {MAX_PHOTO_BYTES} from '@/lib/photo-policy';
export const runtime='nodejs';
export const maxDuration=180;
export async function POST(request:Request){
 try{
  await requireStaff();
  if(!request.headers.get('origin')||new URL(request.headers.get('origin')!).host!==request.headers.get('host'))return Response.json({error:'Invalid request origin.'},{status:403});
  const reader=request.body?.getReader();if(!reader)return Response.json({error:'Choose a photo or enter a prompt.'},{status:400});
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_PHOTO_BYTES+65536){await reader.cancel();return Response.json({error:'Choose an image under 20 MiB.'},{status:413});}chunks.push(value);}
  const body=Buffer.concat(chunks);let bytes:Uint8Array;
  if(request.headers.get('content-type')?.includes('application/json')){
   if(body.length>10000)return Response.json({error:'Use a shorter prompt.'},{status:400});
   const {prompt}=JSON.parse(body.toString());
   if(typeof prompt!=='string'||!prompt.trim()||prompt.length>2000)return Response.json({error:'Describe your image in 1–2,000 characters.'},{status:400});
   if(!process.env.OPENAI_API_KEY)return Response.json({error:'Image generation is not configured yet. You can upload a photo instead.'},{status:503});
   const response=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_IMAGE_MODEL||'gpt-image-1',prompt:`Create an inviting editorial event cover photo. No text or logos. ${prompt}`,size:'1536x1024',quality:'medium',n:1}),signal:AbortSignal.timeout(150000)});
   if(!response.ok)return Response.json({error:'Image generation failed. Please try again or upload a photo.'},{status:502});
   const result=await response.json();if(!result.data?.[0]?.b64_json)throw new Error('Missing generated image');
   bytes=Buffer.from(result.data[0].b64_json,'base64');
  }else{
   const form=await new Response(body,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();const file=form.get('file');
   if(!(file instanceof File))return Response.json({error:'Choose a photo.'},{status:400});
   bytes=new Uint8Array(await file.arrayBuffer());
  }
  return Response.json({url:await saveEventImage(bytes)});
 }catch(error){return Response.json({error:error instanceof StaffAccessError?'Please sign in as an admin.':'Unable to create image. Use a JPG, PNG, WebP or GIF under 20 MiB.'},{status:error instanceof StaffAccessError?403:400});}
}
