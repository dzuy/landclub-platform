'use client';
import {useCallback,useRef} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {InvestmentTermsEditor} from './investment-terms-editor';
import {investmentLabel} from '@/lib/investment-label';
import type {getTermsDetail} from '@/app/dashboard/members/[id]/terms/[position]/actions';
export type TermsDetailData=NonNullable<Awaited<ReturnType<typeof getTermsDetail>>['detail']>;
export type LeaveGuard=(guard:(()=>Promise<boolean>)|null)=>void;
export function InvestmentTermsDetail({member,detail,onBeforeLeave,backHref}:{member:string;detail:TermsDetailData;onBeforeLeave?:LeaveGuard;backHref?:string}){
 const guard=useRef<(()=>Promise<boolean>)|null>(null),router=useRouter();
 const register=useCallback((value:(()=>Promise<boolean>)|null)=>{guard.current=value;onBeforeLeave?.(value);},[onBeforeLeave]);
 return <section>{backHref&&<Link href={backHref} onClick={event=>{event.preventDefault();void (async()=>{if(!guard.current||await guard.current())router.push(backHref);})();}}>Back to member investments</Link>}<h2>{investmentLabel(detail.selected)} · Terms</h2><p className="muted">Source reference: {detail.selected.source_id}</p><InvestmentTermsEditor member={member} position={detail.selected.id} initial={detail.state} initialAgreements={detail.agreements} onBeforeLeave={register}/></section>;
}
