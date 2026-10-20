 'use server';
import {requireStaff} from '@/lib/staff';
import {investorPlatformDatabase} from '@/lib/investor-platform-db';
import {InvestmentTermsRepository} from '@/lib/investment-terms-repository';
export async function termsAction(member:string,position:string,operation:string,payload:unknown){
 try{const actor=await requireStaff(),repo=new InvestmentTermsRepository(await investorPlatformDatabase());if(!(await repo.memberPositions(member,actor)).some(p=>p.id===position))throw new Error('Investment unavailable for this member.');
 const p=payload as {terms:unknown;version:number;asOf:string;digest:string};
 if(operation==='preview')return {preview:await repo.preview(position,p.terms,p.asOf,actor)};
 if(operation==='draft'||operation==='confirm')await repo.save(position,p.terms,p.version,actor,operation==='confirm'?{asOf:p.asOf,digest:p.digest}:undefined);
 else if(operation==='transaction')await repo.transaction(position,payload,actor);
 else if(operation==='upload'){const file=(payload as FormData).get('file');if(!(file instanceof File))throw new Error('Select a PDF.');await repo.attach(position,file.name,new Uint8Array(await file.arrayBuffer()),actor);}
 else throw new Error('Unknown action');
 return {state:await repo.read(position,actor),agreements:await repo.agreements(position,actor)};
 }catch(e){return {error:e instanceof Error?e.message:'Unable to save terms.'};}
}

export async function getTermsDetail(member:string,position:string){
 try{const actor=await requireStaff(),repo=new InvestmentTermsRepository(await investorPlatformDatabase());
 if(!await repo.ready())return {error:'Terms setup pending.'};
 const selected=(await repo.memberPositions(member,actor)).find(p=>p.id===position);
 if(!selected)return {error:'Investment unavailable for this member.'};
 return {detail:{selected,state:await repo.read(position,actor),agreements:await repo.agreements(position,actor)}};
 }catch{return {error:'Unable to load investment terms. Please try again.'};}
}
