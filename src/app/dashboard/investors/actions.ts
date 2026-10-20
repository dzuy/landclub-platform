'use server';
import {switchDashboardPreview} from '../preview-actions';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireStaff} from '@/lib/staff';
import {investorPlatformStore} from '@/lib/investor-platform-store';
import {loadInvestorSourceReview} from '@/lib/investor-source-store';
import {preparePlatformImport} from '@/lib/investor-platform';
import {authAdminClient} from '@/lib/auth/admin';
import {validateDocumentContent} from '@/lib/document-content';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
async function operation(form:FormData,work:()=>Promise<void>){let error='';try{await work();}catch(e){error=e instanceof Error?e.message:'Operation failed.';}const member=z.uuid().safeParse(form.get('memberReturn'));const destination=member.success?`/dashboard/members/${member.data}`:'/dashboard/investor-data';revalidatePath('/dashboard/members');revalidatePath(destination);redirect(`${destination}?${error?'error='+encodeURIComponent(error):'saved=1'}`);}
export async function importSources(form:FormData){const actor=await requireStaff();await operation(form,async()=>{const {books}=await loadInvestorSourceReview(actor);const plan=preparePlatformImport(books);if(form.get('digest')!==plan.digest)throw new Error('Source changed. Review the dry run again.');await (await investorPlatformStore()).import(books,actor);});}
export async function startPreview(form:FormData){return switchDashboardPreview(form);}
export async function exitPreview(form:FormData){const actor=await requireStaff();await(await investorPlatformStore()).endPreview(String(form.get('token')),actor);redirect('/dashboard/portfolio');}
export async function resolveFinding(form:FormData){const actor=await requireStaff();await operation(form,async()=>{await(await investorPlatformStore()).resolve(String(form.get('finding')),String(form.get('resolution')),actor);});}
export async function publishReport(form:FormData){const actor=await requireStaff();await operation(form,async()=>{const action=z.enum(['review','release','withdraw']).parse(form.get('operation'));await(await investorPlatformStore()).publication(String(form.get('report')),action,actor);});}
export async function changeAccess(form:FormData){const actor=await requireStaff();await operation(form,async()=>{await(await investorPlatformStore()).setAccess(String(form.get('person')),String(form.get('holder')),form.get('active')==='true',actor);});}
export async function linkAccount(form:FormData){const actor=await requireStaff();await operation(form,async()=>{const user=String(form.get('user')||'').trim();if(user){z.uuid().parse(user);const {data,error}=await authAdminClient().auth.admin.getUserById(user);if(error||!data.user?.email_confirmed_at)throw new Error('Choose an existing confirmed account.');}await(await investorPlatformStore()).mapAccount(String(form.get('person')),user||null,actor);});}
export async function issueStatement(form:FormData){const actor=await requireStaff();await operation(form,async()=>{await(await investorPlatformStore()).statement(String(form.get('report')),actor);});}
export async function uploadReportDocument(form:FormData){const actor=await requireStaff();await operation(form,async()=>{
 const report=z.uuid().parse(form.get('report')),file=form.get('file');if(!(file instanceof File)||!file.size||file.size>1024*1024)throw new Error('Choose a PDF, PNG or JPEG up to 1 MiB.');
 if(!/\.(pdf|png|jpe?g)$/i.test(file.name))throw new Error('Use PDF, PNG or JPEG.');
 const bytes=new Uint8Array(await file.arrayBuffer());await validateDocumentContent(file.name,bytes);
 const store=await investorPlatformStore();await store.db.transaction(async tx=>{const row=await tx.query('SELECT id FROM investor_reports WHERE id=$1 AND released_at IS NULL FOR UPDATE',[report]);if(!row.rows.length)throw new Error('Withdraw the report before changing its documents.');await tx.query("UPDATE investor_reports SET review_state='draft' WHERE id=$1",[report]);const id=randomUUID();await tx.query('INSERT INTO investor_report_documents(id,report_id,filename,content) VALUES($1,$2,$3,$4)',[id,report,file.name.replace(/[\r\n\\/]/g,'_').slice(0,180),bytes]);await tx.query('INSERT INTO investor_operations_audit(id,actor_id,action,resource_id) VALUES($1,$2,$3,$4)',[randomUUID(),actor.id,'document.upload',id]);});
 });}
