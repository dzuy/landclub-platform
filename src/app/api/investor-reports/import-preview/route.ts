import {clubIdentity} from '@/lib/staff';
import {hasSameOrigin} from '@/lib/request-origin';
import {limitedBody} from '@/lib/member-document-http';
import {reportHeaders} from '@/lib/investor-report-http';
import {previewInvestorImport} from '@/lib/investor-import-preview';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const actor=await clubIdentity();
 if(!actor?.admin)return Response.json({error:'Admin access required.'},{status:403,headers:reportHeaders});
 if(!hasSameOrigin(request))return Response.json({error:'Invalid request origin.'},{status:403,headers:reportHeaders});
 try{return Response.json(previewInvestorImport(JSON.parse((await limitedBody(request,1048576)).toString('utf8')),actor),{headers:reportHeaders});}
 catch{return Response.json({error:'Invalid normalized import. Check source IDs, decimal strings, date-only values and relationships.'},{status:400,headers:reportHeaders});}
}
