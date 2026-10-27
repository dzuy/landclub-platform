import type {ReactNode} from 'react';
import Link from 'next/link';
import type {MemberPropertyDetail} from '@/lib/member-property-presentation';
import {homePropertyPhoto} from '@/lib/member-home';
import {photoThumbnailUrl} from '@/lib/photo-thumbnail-url';
import styles from './member-property-card.module.css';

export function MemberPropertyCard({detail,handle,preview=false}:{detail:MemberPropertyDetail;handle?:ReactNode;preview?:boolean}){
 const {id,property}=detail;
 const name=property.name||'Untitled property';
 const photo=homePropertyPhoto(property);
 return <article className={styles.card} id={preview?undefined:`property-${id}`} aria-label={name}>
  <div className={styles.heading}>{handle}<h2>{name}</h2></div>
  <Link href={`/dashboard/my-properties/${id}`} className={styles.link} tabIndex={preview?-1:undefined} draggable={false}>
   {photo?<img className={styles.image} src={photoThumbnailUrl(photo.src)} draggable={false} loading="lazy" decoding="async" alt={photo.alt}/>:<div className={styles.noImage}>Property photography coming soon</div>}
   <p>{property.region||'Location to be confirmed'}</p>
   <span className={styles.action}>View property →</span>
  </Link>
 </article>;
}
