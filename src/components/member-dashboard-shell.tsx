import {PropertyCardOrderProvider} from './property-card-order-provider';
import {stopDashboardPreview} from '@/app/dashboard/preview-actions';
import {redirect} from 'next/navigation';
import {clubIdentity} from '@/lib/staff';
import {investorReportStore} from '@/lib/investor-report-store';
import {DashboardNav} from '@/components/dashboard-nav';
import {memberPropertyDetails} from '@/lib/member-property-access';
export async function MemberDashboardShell({children,sharing=false}:{children:React.ReactNode;sharing?:boolean}){
 const actor=await clubIdentity();if(!actor)redirect('/signin');
 const properties=await memberPropertyDetails(actor.id);
 if(actor.preview?.expired)return <main className="cms-main"><h1>View as has ended</h1><p>This preview expired or its member mapping is unavailable. Exit to return to your own account.</p><form action={stopDashboardPreview}><button>Exit View as</button></form></main>;
 const reports=await investorReportStore();
 const portfolio=await reports.isReady()?await reports.list({...actor,admin:false}):[];
 return <PropertyCardOrderProvider key={`${actor.id}:${actor.preview?.personId||'self'}`} memberId={actor.id} propertyIds={properties.map(p=>p.id)}>{actor.preview&&<aside className="dashboard-preview-banner" aria-label="View as session"><div><strong>Viewing as {actor.name}</strong><span>{sharing&&!actor.preview.memberTargetId?'Sharing actions require confirmation':'Read-only'} · {actor.preview.notice||(actor.preview.mode==='draft'?'Includes unreleased investment reports':'Investor-visible reports')} · 30-minute session</span></div><form action={stopDashboardPreview}><button>Exit View as</button></form></aside>}{actor.local&&<div className="local-mode"><strong>Local development workspace</strong><span>Property edits are saved on this computer.</span></div>}<div key={`${actor.id}:${actor.preview?.personId||'self'}`} className="cms-shell dashboard-shell"><DashboardNav portfolio={portfolio.map(r=>({id:r.id,name:r.kind==='reserve'?r.project_name:`${r.project_name.replace(/^Land Club /,'').replace(/ LLC$/,'')} · ${r.kind==='loan'?'Loan':'Equity'}`}))} showAdminTools={actor.admin} properties={properties.map(({id,property})=>({id,name:property.name}))}/><main className="cms-main dashboard-main">{children}</main></div></PropertyCardOrderProvider>;
}
