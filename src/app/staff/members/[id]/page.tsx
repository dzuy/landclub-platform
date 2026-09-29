import Link from 'next/link';
import {requireStaffPage} from '@/lib/staff';
import {loadMemberDetail} from '@/lib/member-detail';
import {MemberDetailContent} from '../member-detail-content';
export default async function MemberPage({params}:{params:Promise<{id:string}>}){
 await requireStaffPage();const {id}=await params;let detail;try{detail=await loadMemberDetail(id);}catch{return <><Link href="/staff/members">Back to members</Link><h1>Member details unavailable.</h1><p>We couldn’t load this account. Refresh and try again.</p></>;}
 return <><Link href="/staff/members">Back to members</Link><h1>{detail.kind==='member'?detail.member.name||detail.member.email:'Pending invitation'}</h1><MemberDetailContent detail={detail}/></>;
}
