import {z} from 'zod';
import {clubIdentity} from '@/lib/staff';
import {investorPlatformStore} from '@/lib/investor-platform-store';
import {investorReportStore} from '@/lib/investor-report-store';
import {reportHeaders} from '@/lib/investor-report-http';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await clubIdentity(),{id}=await params;if(!actor||!z.uuid().safeParse(id).success)return new Response('Not found',{status:404,headers:reportHeaders});
 const store=await investorPlatformStore(),row=(await store.db.query<{report_id:string;edition:number;payload:{report:unknown;issuedAt:string;calculationVersion:string}}>('SELECT report_id,edition,payload FROM investor_statement_snapshots WHERE id=$1',[id])).rows[0];
 const token=new URL(request.url).searchParams.get('preview'),ctx=token&&actor.admin?await store.preview(token,actor):null;
 if(token&&!ctx)return new Response('Not found',{status:404,headers:reportHeaders});
 if(!row||!await (ctx?ctx.repo:await investorReportStore()).get(row.report_id,ctx?ctx.actor:actor))return new Response('Not found',{status:404,headers:reportHeaders});
 await store.auditDownload(actor,id,ctx?ctx.person.id:null);
 return Response.json({edition:row.edition,report:row.payload.report,issuedAt:row.payload.issuedAt,calculationVersion:row.payload.calculationVersion},{headers:{...reportHeaders,'Content-Disposition':'attachment; filename="statement-data.json"'}});
}
