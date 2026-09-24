'use server';
import {revalidatePath} from 'next/cache';
import {requireStaff,StaffAccessError} from '@/lib/staff';
import {eventStore} from '@/lib/event-store';
import {eventSchema,type ClubEvent} from '@/lib/events';
export async function saveEvent(input:unknown,id?:string,version?:number):Promise<{event?:ClubEvent;error?:string}>{
 try{
  const actor=await requireStaff();const result=eventSchema.safeParse(input);
  if(!result.success)return {error:result.error.issues[0]?.message||'Check the event details.'};
  const event=await (await eventStore()).save(result.data,actor,id,version);
  revalidatePath('/staff/events');revalidatePath('/staff/manage-events');
  return {event};
 }catch(error){if(error instanceof StaffAccessError)return {error:'Only admins can manage events.'};if(error instanceof Error&&error.message.startsWith('This event changed'))return {error:error.message};return {error:'Unable to save this event. Please try again.'};}
}
