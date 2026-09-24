import {notFound} from 'next/navigation';
import {z} from 'zod';
import {requireStaff} from '@/lib/staff';
import {store} from '@/lib/store';
import {PropertyEditor} from '@/components/property-editor';
export default async function Edit({params}:{params:Promise<{id:string}>}){await requireStaff();const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();const repo=await store(),record=await repo.get(id);if(!record)notFound();return <PropertyEditor key={record.id} initial={JSON.parse(JSON.stringify(record))} history={JSON.parse(JSON.stringify(await repo.history(id)))}/>}
