import {z} from 'zod';
import {clubIdentity} from '@/lib/staff';
import {investorPlatformStore} from '@/lib/investor-platform-store';
import {reportHeaders} from '@/lib/investor-report-http';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await clubIdentity(),{id}=await params;
 if(!actor?.admin||!z.uuid().safeParse(id).success)return new Response('Not found',{status:404,headers:reportHeaders});
 const store=await investorPlatformStore(),file=(await store.db.query<{filename:string;content:Uint8Array}>('SELECT filename,content FROM investor_source_files WHERE id=$1',[id])).rows[0];
 if(!file)return new Response('Not found',{status:404,headers:reportHeaders});
 await store.auditDownload(actor,id);
 return new Response(new Uint8Array(file.content),{headers:{...reportHeaders,'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="source.xlsx"; filename*=UTF-8''${encodeURIComponent(file.filename).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16))}`,'Content-Security-Policy':"sandbox; default-src 'none'"}});
}
