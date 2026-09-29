'use server';
import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {requireStaff} from '@/lib/staff';
import {authAdminClient} from '@/lib/auth/admin';
import {authClient} from '@/lib/auth/client';
import {managedMember} from '@/lib/managed-member';
import {memberInfoSchema,propertyRolesSchema,type MemberInfo} from '@/lib/member-properties';
import {preparedMemberStore} from '@/lib/prepared-member-store';
import {MemberPropertyRepository} from '@/lib/member-properties';
import {memberPropertyStore} from '@/lib/member-property-store';

export async function saveMemberInfo(userId:string,input:MemberInfo){
 try{
  await requireStaff();z.uuid().parse(userId);const parsed=memberInfoSchema.safeParse(input);if(!parsed.success)return {error:parsed.error.issues[0].message};
  const drafts=await preparedMemberStore();
  if(await drafts.get(userId)){await drafts.saveInfo(userId,parsed.data);revalidatePath('/staff/members');return {message:'Member information saved.'};}
  const user=await managedMember(userId);
  const metadata={...user.user_metadata,display_name:parsed.data.displayName,home_region:parsed.data.homeRegion,contact_phone:parsed.data.contactPhone};
  const {error:saveError}=process.env.SUPABASE_SECRET_KEY?await authAdminClient().auth.admin.updateUserById(userId,{user_metadata:metadata}):await (await authClient()).auth.updateUser({data:metadata});
  if(saveError)return {error:'Member information could not be saved.'};
  revalidatePath('/staff/members');revalidatePath(`/staff/members/${userId}`);revalidatePath('/staff/profile');return {message:'Member information saved.'};
 }catch{return {error:'Unable to save member information. Check your admin access and try again.'};}
}
const associationSchema=z.object({userId:z.uuid(),propertyId:z.uuid(),roles:propertyRolesSchema,version:z.number().int().positive().optional(),remove:z.boolean().optional()});
export async function saveMemberProperty(input:unknown){
 try{
  const actor=await requireStaff();const parsed=associationSchema.safeParse(input);if(!parsed.success)return {error:'Choose a member, property, and at least one valid property role.'};
  const {userId,propertyId,roles,version,remove}=parsed.data;
  const drafts=await preparedMemberStore();const prepared=await drafts.get(userId);
  if(!prepared)await managedMember(userId);
  const repo=await memberPropertyStore();
  async function change(repository:MemberPropertyRepository){if(remove){if(!version)throw new Error('Refresh the association before removing it.');await repository.remove(userId,propertyId,version,actor);}else await repository.save(userId,propertyId,roles,actor,version);}
  if(prepared)await drafts.edit(userId,tx=>change(new MemberPropertyRepository({...tx,transaction:work=>work(tx)})));
  else await change(repo);

  revalidatePath(`/staff/members/${userId}`);revalidatePath('/staff/members');
  return {message:remove?'Property association removed.':'Property association saved.',associations:await repo.list(userId)};
 }catch(error){const message=error instanceof Error?error.message:'';return {error:message.startsWith('This association')||message.startsWith('This property is already')?message:'Unable to change the property association. Refresh and try again.'};}
}

export async function getMemberDetail(id:string){
 try{await requireStaff();const {loadMemberDetail}=await import('@/lib/member-detail');return {detail:await loadMemberDetail(id)};}
 catch{return {error:'Unable to load this member. Check your admin access and try again.'};}
}
