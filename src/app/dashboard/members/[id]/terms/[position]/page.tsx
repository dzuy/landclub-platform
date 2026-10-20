import {requireStaffPage} from '@/lib/staff';
import {getTermsDetail} from './actions';
import {InvestmentTermsDetail} from '@/components/investment-terms-detail';
export default async function TermsPage({params}:{params:Promise<{id:string;position:string}>}){
 await requireStaffPage();const {id,position}=await params,result=await getTermsDetail(id,position);
 return <>{result.detail?<InvestmentTermsDetail backHref={`/dashboard/members/${id}`} member={id} detail={result.detail}/>:<p role="alert">{result.error}</p>}</>;
}
