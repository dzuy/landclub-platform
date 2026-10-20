import {clubIdentity} from '@/lib/staff';
import {investorPlatformStore} from '@/lib/investor-platform-store';
import {reportHeaders,serveInvestorReport,serveInvestorDocument} from '@/lib/investor-report-http';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{token:string;id:string}>}){
 const actor=await clubIdentity();if(!actor?.admin)return new Response('Not found',{status:404,headers:reportHeaders});
 const {token,id}=await params,store=await investorPlatformStore(),ctx=await store.preview(token,actor);if(!ctx)return new Response('Preview expired',{status:404,headers:reportHeaders});
 const url=new URL(request.url),document=url.searchParams.get('document');
 if(document){const report=await ctx.repo.get(id,ctx.actor);if(!report?.documents.some(d=>d.id===document))return new Response('Not found',{status:404,headers:reportHeaders});}
 await store.auditDownload(actor,document??id,ctx.person.id);
 return document?serveInvestorDocument(ctx.repo,document,ctx.actor):serveInvestorReport(ctx.repo,id,ctx.actor,url.searchParams.get('download')==='csv'?'csv':'json');
}
