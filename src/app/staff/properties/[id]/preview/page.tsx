import {notFound} from 'next/navigation';
import {z} from 'zod';
import {requireStaffPage} from '@/lib/staff';
import {store} from '@/lib/store';
import {PropertyPage} from '@/components/property-page';
export default async function Preview({params}:{params:Promise<{id:string}>}){await requireStaffPage();const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();const p=await (await store()).get(id);if(!p)notFound();return <><p><a href={'/staff/properties/'+id}>← Return to editor</a></p><PropertyPage property={p.draft} preview/></>}
