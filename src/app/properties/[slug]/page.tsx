import {notFound} from 'next/navigation';
import {store} from '@/lib/store';
import {PropertyPage} from '@/components/property-page';
export const dynamic='force-dynamic';
export default async function Property({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const p=await (await store()).publicBySlug(slug);if(!p)notFound();return <PropertyPage property={p}/>}
