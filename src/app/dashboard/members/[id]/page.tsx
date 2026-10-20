import Link from 'next/link';
import {requireStaffPage} from '@/lib/staff';
import {loadMemberDetail} from '@/lib/member-detail';
import {MemberDetailContent} from '../member-detail-content';
export default async function MemberPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{error?:string;saved?:string}>}){
 await requireStaffPage();const q=await searchParams;const {id}=await params;let detail;try{detail=await loadMemberDetail(id);}catch{return <><Link href="/dashboard/members">Back to members</Link><h1>Member details unavailable.</h1><p>We couldn’t load this account. Refresh and try again.</p></>;}
 return <><Link href="/dashboard/members">Back to members</Link><h1>{detail.kind==='member'?detail.member.name||detail.member.email:detail.kind==='prepared'?detail.prepared.info.displayName||detail.prepared.email:'Pending invitation'}</h1>{q.error&&<p role="alert" className="cms-error">{q.error}</p>}{q.saved&&<p role="status">Saved.</p>}<MemberDetailContent detail={detail}/></>;
}
