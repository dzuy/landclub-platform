import {PageHeading} from '@/components/page-heading';
import {PropertyFollowList} from '@/components/property-follow-list';
import {requireMemberPage} from '@/lib/staff';
import {propertyFollowCatalog} from '@/lib/property-follow-catalog';
export default async function MyPropertiesPage(){
 const actor=await requireMemberPage();
 return <><PageHeading title="Properties"/><PropertyFollowList initial={await propertyFollowCatalog(actor.id)} readOnly={!!actor.preview}/></>;
}
