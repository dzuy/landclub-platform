 'use server';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {authenticatedIdentity,StaffAccessError} from '@/lib/staff';
import {investorPlatformStore} from '@/lib/investor-platform-store';
import {PREVIEW_COOKIE} from '@/lib/dashboard-preview';
export async function switchDashboardPreview(form:FormData){
 const actor=await authenticatedIdentity();if(!actor?.admin)throw new StaffAccessError();
 const jar=await cookies(),store=await investorPlatformStore(),old=jar.get(PREVIEW_COOKIE)?.value;
 const person=String(form.get('person')||'');
 const token=person?await store.beginPreview(person,form.get('mode')==='draft'?'draft':'investor',actor):null;
 if(old)await store.endPreview(old,actor);
 if(token)jar.set(PREVIEW_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'});
 else jar.delete(PREVIEW_COOKIE);
 revalidatePath('/','layout');redirect('/dashboard');
}
export async function stopDashboardPreview(){
 const actor=await authenticatedIdentity(),jar=await cookies(),token=jar.get(PREVIEW_COOKIE)?.value;
 if(actor?.admin&&token)await(await investorPlatformStore()).endPreview(token,actor);
 jar.delete(PREVIEW_COOKIE);revalidatePath('/','layout');redirect('/dashboard');
}
