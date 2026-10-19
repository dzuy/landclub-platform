import Link from 'next/link';
import {headers} from 'next/headers';
import {localSourceReviewAllowed} from '@/lib/investor-source-review';
import {PageHeading} from '@/components/page-heading';
import {requireMemberPage} from '@/lib/staff';
import {investorReportStore} from '@/lib/investor-report-store';
export const dynamic='force-dynamic';
export default async function ReportsPage(){
 const actor=await requireMemberPage();
 const store=await investorReportStore(),ready=await store.isReady();
 const reports=ready?await store.list(actor):[];
 return <><PageHeading title="Investor reports" description="Reports for the investments you are authorized to access."/>{reports.length?<ul>{reports.map(r=><li key={r.id}><Link href={`/dashboard/reports/${r.id}`}>{r.project_name} · {r.position_name} · {r.title}</Link> — {r.review_state}, unaudited{!r.released_at?' · Not released':''}</li>)}</ul>:<p>{ready?'No reports are available for your account yet.':'Investor reports are not available yet.'}{!ready&&actor.admin&&' Reporting setup is pending; you can review the local draft source data below.'}</p>}{actor.admin&&<p><Link href="/dashboard/reports/import-preview">Validate an import preview</Link></p>}{localSourceReviewAllowed(actor,process.env.NODE_ENV,(await headers()).get('host')||'')&&<p><Link href="/dashboard/reports/source-review">Review actual source workbooks and draft positions</Link> · <Link href="/dashboard/reports/preview">Preview the report layout with missing-value placeholders</Link></p>}</>;
}
