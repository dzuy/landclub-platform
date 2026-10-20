import 'server-only';
import {InvestmentTermsRepository} from './investment-terms-repository';
import {requireStaff} from './staff';
import {investorPlatformStore} from './investor-platform-store';
import {InvestorReportRepository} from './investor-reports';
import type {PreparedInvestor} from './investor-platform';

export async function loadMemberInvestorDetail(memberId:string){
 const actor=await requireStaff(),store=await investorPlatformStore();
 if(!await store.ready())return null;
 // Explicit identity links only; names and email addresses are not access mappings.
 const person=(await store.db.query<PreparedInvestor>('SELECT id,display_name,source_id,auth_user_id,prepared_member_id,disabled_at::text FROM report_people WHERE auth_user_id=$1 OR (auth_user_id IS NULL AND prepared_member_id=$1)',[memberId])).rows[0];
 if(!person)return null;
 const grants=(await store.db.query<{holder_id:string;name:string;revoked_at:string|null}>('SELECT a.holder_id,h.name,a.revoked_at::text FROM investor_access a JOIN investment_holders h ON h.id=a.holder_id WHERE a.person_id=$1',[person.id])).rows;
 const ids=(await store.db.query<{id:string}>('SELECT r.id FROM investor_reports r JOIN investment_positions p ON p.id=r.position_id JOIN investor_access a ON a.holder_id=p.holder_id WHERE a.person_id=$1 ORDER BY r.created_at DESC',[person.id])).rows;
 const repo=new InvestorReportRepository(store.db);
 const reports=(await Promise.all(ids.map(r=>repo.get(r.id,actor)))).filter(r=>r!==null);
 const statements=(await store.db.query<{id:string;report_id:string;edition:number;captured_at:string}>('SELECT s.id,s.report_id,s.edition,s.captured_at::text FROM investor_statement_snapshots s JOIN investor_reports r ON r.id=s.report_id JOIN investment_positions p ON p.id=r.position_id JOIN investor_access a ON a.holder_id=p.holder_id WHERE a.person_id=$1 ORDER BY s.captured_at DESC',[person.id])).rows;
 const termsRepo=new InvestmentTermsRepository(store.db);
 const termPositions=await termsRepo.ready()?await termsRepo.memberPositions(memberId,actor):[];
 return {person,grants,reports,statements,termPositions};
}
export type MemberInvestorDetail=Awaited<ReturnType<typeof loadMemberInvestorDetail>>;
