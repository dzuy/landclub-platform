import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireMemberPage} from '@/lib/staff';
import {investorPlatformStore} from '@/lib/investor-platform-store';
import {investorReportStore} from '@/lib/investor-report-store';
import {CompanyInvestorReport} from '@/components/company-investor-report';
export const dynamic='force-dynamic';
export default async function CompanyReports({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{preview?:string}>}){
 const actor=await requireMemberPage(),{id}=await params,{preview}=await searchParams,store=await investorPlatformStore();
 const ctx=preview&&actor.admin?await store.preview(preview,actor):null;if(preview&&!ctx)notFound();
 const repo=ctx?.repo??await investorReportStore(),effective=ctx?.actor??{...actor,admin:false};
 const position=await repo.get(id,effective);if(!position)notFound();
 const company=await repo.company(id,effective),back=(ctx?`/dashboard/investor-preview/${preview}`:'/dashboard/portfolio')+`#position-${id}`;
 if(!company)return <><Link href={back}>◀ Your investment</Link><h1>Company reports</h1><p>No company financial report has been supplied for {position.project_name} yet.</p></>;
 return <>{ctx&&<p>Previewing {ctx.person.display_name}’s company reports · read-only{ctx.mode==='draft'?' · includes draft data':''}</p>}<CompanyInvestorReport report={company} back={back}/></>;
}
