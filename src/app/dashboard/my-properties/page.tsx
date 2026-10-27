import {PageHeading} from '@/components/page-heading';
import {SortablePropertyGrid} from '@/components/sortable-property-grid';
import {requireMemberPage} from '@/lib/staff';
import {memberPropertyDetails} from '@/lib/member-property-access';

export default async function MyPropertiesPage(){
 const actor=await requireMemberPage();
 const properties=await memberPropertyDetails(actor.id);
 return <>
  <PageHeading title="Properties"/>
  {properties.length?<SortablePropertyGrid key={actor.id} properties={properties} memberId={actor.id}/>:<section className="panel member-properties-empty"><h2>Your properties will appear here.</h2><p>You’re not associated with a property yet. Once a Land Club administrator adds one to your account, its overview and navigation link will show here.</p></section>}
 </>;
}
