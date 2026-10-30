import type {PropertyDraft} from './schema';

type PhotoFields=Pick<PropertyDraft,'hero'|'imageAlt'|'gallery'|'media'|'photoTags'>;
export function removePropertyPhoto(draft:PhotoFields,src:string):PhotoFields{
 const photoTags={...draft.photoTags};
 delete photoTags[src];
 return {
  hero:draft.hero===src?'':draft.hero,
  imageAlt:draft.hero===src?'':draft.imageAlt,
  gallery:draft.gallery.filter(photo=>photo.src!==src),
  media:draft.media.filter(photo=>photo.kind!=='image'||photo.url!==src),
  photoTags,
 };
}
