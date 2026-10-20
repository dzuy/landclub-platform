import {notFound,redirect} from 'next/navigation';
import {sharingActor,sharingStore,sharedReports} from '@/lib/investment-sharing-store';
import {reportAmount} from '@/lib/investor-reports';
import {investorPlatformStore} from '@/lib/investor-platform-store';
export default async function Page({params}:{params:Promise<{id:string}>}){
 const actor=await sharingActor();if(!actor)redirect('/signin');
 if(!await (await sharingStore()).ready())notFound();
 const {id}=await params,who={...actor,admin:false},repo=await sharedReports(),report=await repo.get(id,who);if(!report)notFound();
 await (await investorPlatformStore()).auditDownload(who,id);
 return <><div className="sharing-badge">Shared with you · Read-only · Unaudited</div><h1>{report.title}</h1><p>{report.holder_name} · {report.project_name} · {report.position_name}</p><p>As of {report.as_of||'date not supplied'}. This investment is separate from your own portfolio.</p><p>{report.narrative}</p><a href={`/api/shared-investments/${id}?kind=csv`}>Download report CSV</a><section><h2>Investment report</h2><table><thead><tr><th>Item</th><th>Amount</th><th>Basis</th></tr></thead><tbody>{report.lines.map(l=><tr key={l.id}><td>{l.label}</td><td>{reportAmount(l.amount,report.currency)}</td><td>{l.basis}</td></tr>)}</tbody></table></section><section><h2>Schedules</h2>{report.schedules.map(s=><p key={s.id}>{s.label} · {s.scheduled_date||'Not supplied'} · {s.confirmation}<br/>{s.note}</p>)}</section><section><h2>Investment documents</h2>{report.documents.length?report.documents.map(d=><p key={d.id}><a href={`/api/shared-investments/${d.id}?kind=document`}>{d.filename}</a></p>):<p>No documents attached to this report.</p>}</section></>;
}
