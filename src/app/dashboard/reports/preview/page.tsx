import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireMemberPage} from '@/lib/staff';
import {InvestorReportView} from '@/components/investor-report';
import type {InvestorReport,ReportLine} from '@/lib/investor-reports';
export const dynamic='force-dynamic';
export default async function ReportPreview({searchParams}:{searchParams:Promise<{project?:string}>}){
 const actor=await requireMemberPage();if(!actor.local||!actor.admin||process.env.NODE_ENV!=='development')notFound();
 const project=(await searchParams).project;
 const reserve=project==='reserve',sutter=project==='sutter';
 const missing=(section:ReportLine['section'],labels:string[])=>labels.map((label,i)=>({id:`${section}-${i}`,section,label,amount:null,basis:'missing' as const,source_reference:'Awaiting verified import',effective_date:null}));
 const report:InvestorReport={id:'preview',title:'Your investment report',as_of:null,review_state:'draft',released_at:null,project_name:reserve?'Reserve':sutter?'Sutter Creek':'Norden Cross',position_name:reserve?'Separate reserve position':sutter?'Loan position':'Equity position',kind:reserve?'reserve':sutter?'loan':'equity',currency:'USD',holder_name:'Holder mapping pending',narrative:'Local layout preview. Source balances, identity mappings and investor documents are pending review.',source_reference:'No workbook data imported',lines:[...missing('summary',['Cash on hand','Spending','Capital returned','Accrued return']),...missing('position',['Contributed','Principal returned','Remaining capital','Accrued return'])],schedules:[],findings:[],documents:[]};
 return <><nav aria-label="Preview investment"><Link href="?project=norden">Norden Cross</Link> · <Link href="?project=sutter">Sutter Creek</Link> · <Link href="?project=reserve">Separate reserve</Link></nav><InvestorReportView report={report} preview/></>;
}
