import Link from 'next/link';
import {requireStaffPage} from '@/lib/staff';
import {investorPlatformStore} from '@/lib/investor-platform-store';
import {loadInvestorSourceReview} from '@/lib/investor-source-store';
import {preparePlatformImport} from '@/lib/investor-platform';
import {importSources} from '../investors/actions';
import s from '@/components/investor-portfolio.module.css';
export const dynamic='force-dynamic';
export default async function Investors({searchParams}:{searchParams:Promise<{error?:string;saved?:string}>}){
 const actor=await requireStaffPage(),store=await investorPlatformStore(),q=await searchParams;
 if(!await store.ready())return <><h1>Investment source data</h1><p>Reporting migrations 018–020 must be applied before using this workspace.</p></>;

 const files=(await store.db.query<{id:string;filename:string}>('SELECT id,filename FROM investor_source_files ORDER BY filename')).rows;
 const history=(await store.db.query<{action:string;actor_id:string;created_at:string}>("SELECT action,actor_id,created_at::text FROM investor_operations_audit ORDER BY created_at DESC LIMIT 100")).rows;
 let plan:ReturnType<typeof preparePlatformImport>|null=null;try{plan=preparePlatformImport((await loadInvestorSourceReview(actor)).books);}catch{}
 return <div className={s.page}><Link href="/dashboard/members">← Members</Link><h1>Investment source data</h1><p>Shared source files and import tools for all investors.</p>{q.error&&<p role="alert" className={s.error}>{q.error}</p>}{q.saved&&<p role="status">Saved.</p>}<details className={s.adminDisclosure}><summary>Source data &amp; imports<span>Original spreadsheets, calculation checks and source processing.</span></summary><div className={s.disclosureBody}><p className={s.subtle}>{process.env.DATABASE_URL?'Hosted investor database':'Offline local investor database'}. Importing does not send invitations.</p> <section className={s.card}><h2>Existing source data</h2><p>This processes the October 16 data already loaded. Uploading new spreadsheets is not available here yet.</p><p><Link href="/dashboard/investors/calculations">Open calculation review →</Link></p>{plan?<><p>Dry run: 2 prepared people · 2 holders · 3 entities · 4 positions. Four October 16 workbooks. All balances remain draft.</p><ul>{plan.warnings.map(w=><li key={w}>{w}</li>)}</ul><details><summary>Review positions</summary>{plan.reports.map(r=><p key={r.id}>{r.position_name} · {r.holder_name} · {r.project_name}</p>)}<small>Source digest: {plan.digest}</small></details><form action={importSources}><input type="hidden" name="digest" value={plan.digest}/><button className={s.button}>Import / check this source version</button></form><p className={s.subtle}>An identical import does nothing. A changed version adds new draft reports, preserving earlier editions and access revocations.</p></>:<p>No imported source evidence is available in this database.</p>}</section>
 <details className={s.card}><summary>Original source spreadsheets ({files.length})</summary>{files.map(f=><p key={f.id}><a href={`/api/investor-source-files/${f.id}`}>{f.filename}</a></p>)}<p className={s.subtle}>Private admin evidence. These originals are not shared as investor documents.</p></details></div></details><details className={s.card}><summary>Recent audit history</summary>{history.map((h,i)=><p key={i}>{h.created_at} · {h.action}<br/><small>Administrator / account: {h.actor_id}</small></p>)}</details></div>;
}
