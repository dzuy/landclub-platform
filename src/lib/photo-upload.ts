/** Bound the request so a lost connection cannot leave the gallery locked forever. */
export async function uploadPropertyPhoto(propertyId:string,file:File,{fetcher=fetch,timeoutMs=60000}:{fetcher?:typeof fetch;timeoutMs?:number}={}){
 const form=new FormData();form.set('propertyId',propertyId);form.set('file',file);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetcher('/api/property-photos',{method:'POST',body:form,signal:controller.signal});
  const result=await response.json().catch(()=>({error:'The upload server did not return a response. Try again.'}));
  if(!response.ok)throw new Error(result.error||'Upload failed. Try again.');
  if(typeof result.id!=='string'||typeof result.url!=='string'||!/^\/api\/property-photos\/[0-9a-f-]{36}$/.test(result.url))throw new Error('The upload server returned an incomplete result. Try again.');
  return result as {id:string;url:string};
 }catch(error){if(controller.signal.aborted)throw new Error('Upload timed out. Choose this photo again to retry.');throw error;}
 finally{clearTimeout(timer);}
}
