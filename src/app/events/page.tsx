import {clubIdentity} from '@/lib/staff';
import {currentUser} from '@/lib/auth/identity';
import type {Metadata} from 'next';
import {Events} from '@/components/website/pages';
export const metadata:Metadata={title:'Events | Land Club'};
export default async function Page(){const identity=await clubIdentity()||await currentUser();return <Events authenticated={Boolean(identity)}/>;}
