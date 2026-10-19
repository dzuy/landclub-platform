'use server';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {requireStaff} from '@/lib/staff';
import {managedMember} from '@/lib/managed-member';
import {preparedMemberStore} from '@/lib/prepared-member-store';
import {memberInvestmentStore} from '@/lib/member-investment-store';
import {MemberInvestmentRepository} from '@/lib/member-investments';
export async function saveMemberInvestments(userId:string,input:unknown,version:number){
 try{
  const actor=await requireStaff();z.uuid().parse(userId);
  const drafts=await preparedMemberStore(),prepared=await drafts.get(userId);
  if(!prepared)await managedMember(userId);
  const repo=await memberInvestmentStore();
  const selection=prepared?await drafts.edit(userId,tx=>new MemberInvestmentRepository({...tx,transaction:work=>work(tx)}).save(userId,input,version,actor)):await repo.save(userId,input,version,actor);
  revalidatePath('/dashboard/members');revalidatePath(`/dashboard/members/${userId}`);revalidatePath('/dashboard/profile');
  return {selection};
 }catch(error){const message=error instanceof Error?error.message:'';return {error:message.startsWith('Investments changed')||message.startsWith('A selected property')?message:'Unable to save investments. Check your admin access, refresh, and try again.'};}
}
