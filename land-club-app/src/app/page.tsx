import {store} from '@/lib/store';
import {DiscoveryHome} from '@/components/discovery-home';
export const dynamic='force-dynamic';
export default async function Home(){return <DiscoveryHome properties={await (await store()).publicList()}/>;}
