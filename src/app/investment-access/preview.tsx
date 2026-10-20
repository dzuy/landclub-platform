import {SharingContent} from './content';
import type {InvestmentSharingRepository} from '@/lib/investment-sharing';
export function SharingPreview({name,data}:{name:string;data:Awaited<ReturnType<InvestmentSharingRepository['preview']>>}){
 if(!data)return <><h1>Share investments</h1><p role="alert">Sharing preview unavailable. Restart View As and try again.</p></>;
 return <SharingContent owned={data.owned} invitations={data.invitations} reports={data.reports} onBehalf={{person:data.personId,name}}/>;
}
