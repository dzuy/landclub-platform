import {sharingActor,sharingStore,sharedReports} from '@/lib/investment-sharing-store';
import {serveInvestorDocument,serveInvestorReport,reportHeaders} from '@/lib/investor-report-http';
import {investorPlatformStore} from '@/lib/investor-platform-store';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await sharingActor();if(!actor)return new Response('Please sign in.',{status:401,headers:reportHeaders});
 try{
  if(!await (await sharingStore()).ready())return new Response('Not found.',{status:404,headers:reportHeaders});
  const {id}=await params,kind=new URL(request.url).searchParams.get('kind'),repo=await sharedReports(),who={...actor,admin:false};
  const response=kind==='document'?await serveInvestorDocument(repo,id,who):await serveInvestorReport(repo,id,who,kind==='csv'?'csv':'json');
  if(response.ok)await (await investorPlatformStore()).auditDownload(who,id);
  return response;
 }catch{return new Response('Shared investment unavailable.',{status:503,headers:reportHeaders});}
}
