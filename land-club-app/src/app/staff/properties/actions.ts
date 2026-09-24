'use server';
import {revalidatePath} from 'next/cache';
import {requireStaff} from '@/lib/staff';
import {store} from '@/lib/store';
import {ConflictError} from '@/lib/repository';
import {ZodError} from 'zod';
import {z} from 'zod';
const reference=z.object({id:z.uuid(),version:z.number().int().positive()});
function message(error:unknown){if(error instanceof ZodError)return error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join(' ');if(error instanceof ConflictError)return error.message;if((error as {code?:string})?.code==='23505')return 'That page address is already used by another property.';console.error('Property operation failed:',error instanceof Error?error.name:'unknown');return 'The change could not be saved. Your edits are still here; please try again.';}
export async function saveProperty(id:string,version:number,input:unknown){try{const actor=await requireStaff();reference.parse({id,version});const p=await (await store()).save(id,version,input,actor.id);revalidatePath('/staff/properties');return {ok:true as const,record:JSON.parse(JSON.stringify(p))};}catch(e){return {ok:false as const,error:message(e)};}}
export async function publishProperty(id:string,version:number){try{const actor=await requireStaff();reference.parse({id,version});const p=await (await store()).publish(id,version,actor.id);revalidatePath('/properties','layout');revalidatePath('/staff/properties');return {ok:true as const,record:JSON.parse(JSON.stringify(p))};}catch(e){return {ok:false as const,error:message(e)};}}
export async function unpublishProperty(id:string,version:number){try{const actor=await requireStaff();reference.parse({id,version});const p=await (await store()).unpublish(id,version,actor.id);revalidatePath('/properties','layout');revalidatePath('/staff/properties');return {ok:true as const,record:JSON.parse(JSON.stringify(p))};}catch(e){return {ok:false as const,error:message(e)};}}
export async function createProperty(){try{const actor=await requireStaff();const suffix=crypto.randomUUID().slice(0,8);const p=await (await store()).create({name:'Untitled property',slug:'new-property-'+suffix,region:'Location to be confirmed',category:'Mountains',status:'Draft',headline:'A new place to discover.',summary:'Add a description before publishing.',intro:'Tell the story of this property.',hero:'/images/landscape.png',imageAlt:'Regional landscape reference',isDemo:true,gallery:[],sections:[]},actor.id);revalidatePath('/staff/properties');return {ok:true as const,id:p.id};}catch(e){return {ok:false as const,error:message(e)};}}
