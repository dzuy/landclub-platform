import {clubIdentity,authenticatedIdentity} from '@/lib/staff';
import {cookies} from 'next/headers';
import {PREVIEW_COOKIE} from '@/lib/dashboard-preview';
import {SharingPreview} from './preview';
import {redirect} from 'next/navigation';
import {sharingActor,sharingStore,sharedReports} from '@/lib/investment-sharing-store';
import {SharingContent} from './content';
export default async function Page(){
 const identity=await clubIdentity();
 if(identity?.preview){
  const admin=await authenticatedIdentity(),token=(await cookies()).get(PREVIEW_COOKIE)?.value,store=await sharingStore();
  const data=admin&&token&&await store.ready()?await store.preview(token,admin):null;
  return <SharingPreview name={identity.name} data={data}/>;
 }
 const actor=await sharingActor();if(!actor)redirect('/signin');
 const store=await sharingStore();if(!await store.ready())return <><h1>Investment sharing</h1><p>Sharing is not available yet. Please contact Land Club.</p></>;
 const [owned,invitations,reports]=await Promise.all([store.owned(actor),store.list(actor),(await sharedReports()).list({...actor,admin:false})]);
 return <SharingContent owned={owned} invitations={invitations} reports={reports}/>;
}
