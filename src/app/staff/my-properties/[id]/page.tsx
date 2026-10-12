import {notFound} from 'next/navigation';
import {requireMemberPage} from '@/lib/staff';
import {memberPropertyDetail} from '@/lib/member-property-access';
import {publicDraft} from '@/lib/repository';
import {PropertyPage} from '@/components/property-page';

export default async function MemberPropertyPage({params}:{params:Promise<{id:string}>}){
 const actor=await requireMemberPage();
 const {id}=await params;
 const detail=await memberPropertyDetail(actor.id,id);
 if(!detail)notFound();
 return <PropertyPage property={publicDraft(detail.property)} embedded showInterest={false}/>;
}
