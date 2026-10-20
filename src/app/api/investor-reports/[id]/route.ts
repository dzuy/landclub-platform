import {investorPlatformStore} from '@/lib/investor-platform-store';
import {clubIdentity} from '@/lib/staff';
import {investorReportStore} from '@/lib/investor-report-store';
import {reportHeaders,serveInvestorReport} from '@/lib/investor-report-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await clubIdentity();
 if(!actor)return Response.json({error:'Please sign in.'},{status:401,headers:reportHeaders});
 try{const response=await serveInvestorReport(await investorReportStore(),(await params).id,actor,new URL(request.url).searchParams.get('download')==='csv'?'csv':'json');if(response.ok)await (await investorPlatformStore()).auditDownload(actor,(await params).id);return response;}
 catch{return Response.json({error:'Report unavailable.'},{status:503,headers:reportHeaders});}
}
