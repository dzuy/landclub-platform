import {clubIdentity} from '@/lib/staff';
import {currentUser} from '@/lib/auth/identity';
import type {Metadata} from 'next';
import {CocktailsRecap} from '@/components/website/pages';
export const metadata:Metadata={title:'Cocktails & Trails II | Land Club'};
export default async function Page(){const identity=await clubIdentity()||await currentUser();return <CocktailsRecap authenticated={Boolean(identity)}/>;}
