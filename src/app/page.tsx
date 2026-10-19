import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {clubIdentity} from '@/lib/staff';
import {PublicHome} from '@/components/website/pages';
export default async function Home(){
 const host=(await headers()).get('host')?.split(':')[0];
 if(host==='app.land.club' && await clubIdentity())redirect('/dashboard');
 return <PublicHome/>;
}
