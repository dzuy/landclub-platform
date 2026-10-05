import {PageHeading} from '@/components/page-heading';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireMemberPage} from '@/lib/staff';
import {memberPropertyDetail,memberPropertyThumbnail} from '@/lib/member-property-access';
import {propertyRoleLabels} from '@/lib/member-properties';
import {propertyStatus} from '@/lib/schema';

export default async function MemberPropertyPage({params}:{params:Promise<{id:string}>}){
 const actor=await requireMemberPage();
 const {id}=await params;
 const detail=await memberPropertyDetail(actor.id,id);
 if(!detail)notFound();
 const {property,roles}=detail;
 const thumbnail=memberPropertyThumbnail(property);
 return <>
  <p className="member-property-back"><Link href="/staff/my-properties">← All my properties</Link></p>
  <PageHeading title={property.name} description={property.region}/>
  <div className="member-property-detail-hero"><img src={thumbnail.src} alt={thumbnail.alt}/><div className="member-property-detail-meta"><span className="badge">{propertyStatus(property)}</span><span>{roles.map(role=>propertyRoleLabels[role]).join(', ')}</span></div></div>
  <section className="dashboard-story member-property-overview"><div className="eyebrow">PROPERTY OVERVIEW</div><h2>A sense of place.</h2><p>{property.summary}</p>{property.intro.split('\n').filter(Boolean).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</section>
  {property.gallery.length>0&&<section className="dashboard-lower"><div className="eyebrow">A CLOSER LOOK</div><div className="member-property-gallery">{property.gallery.slice(0,3).map((image,index)=><figure key={`${image.src}-${index}`}><img src={image.src} alt={image.alt}/><figcaption>{image.caption}</figcaption></figure>)}</div></section>}
 </>;
}
