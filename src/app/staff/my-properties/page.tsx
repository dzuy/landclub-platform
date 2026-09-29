import Link from 'next/link';
import {requireMemberPage} from '@/lib/staff';
import {memberPropertyDetails,memberPropertyThumbnail} from '@/lib/member-property-access';
import {propertyRoleLabels} from '@/lib/member-properties';
import {propertyStatus} from '@/lib/schema';

export default async function MyPropertiesPage(){
 const actor=await requireMemberPage();
 const properties=await memberPropertyDetails(actor.id);
 return <>
  <header className="dashboard-heading"><div className="eyebrow">MY PROPERTIES</div><h1>Your places.</h1><p>A closer connection to the places you’re associated with.</p></header>
  {properties.length?<div className="member-property-grid">{properties.map(({id,roles,property})=>{const thumbnail=memberPropertyThumbnail(property);return <article className="member-property-card" id={`property-${id}`} key={id}>
   <Link className="member-property-card-image" href={`/staff/my-properties/${id}`} aria-label={`View ${property.name}`}><img src={thumbnail.src} alt={thumbnail.alt}/></Link>
   <div className="member-property-card-body"><div className="eyebrow">{property.region}</div><h2><Link href={`/staff/my-properties/${id}`}>{property.name}</Link></h2><p>{property.summary}</p><div className="member-property-card-meta"><span className="badge">{propertyStatus(property)}</span><span>{roles.map(role=>propertyRoleLabels[role]).join(', ')}</span></div><Link className="button secondary" href={`/staff/my-properties/${id}`}>View property</Link></div>
  </article>})}</div>:<section className="panel member-properties-empty"><h2>Your properties will appear here.</h2><p>You’re not associated with a property yet. Once a Land Club administrator adds one to your account, its overview and navigation link will show here.</p></section>}
 </>;
}
