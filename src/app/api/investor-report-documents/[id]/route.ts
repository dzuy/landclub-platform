import {clubIdentity} from '@/lib/staff';
import {investorReportStore} from '@/lib/investor-report-store';
import {reportHeaders,serveInvestorDocument} from '@/lib/investor-report-http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await clubIdentity();
 if(!actor)return Response.json({error:'Please sign in.'},{status:401,headers:reportHeaders});
 try{return await serveInvestorDocument(await investorReportStore(),(await params).id,actor);}
 catch{return Response.json({error:'Document unavailable.'},{status:503,headers:reportHeaders});}
}
