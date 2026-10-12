import {checksum,photoStorage,type PhotoObjectStorage} from './photo-object-storage';
import {readPhoto,type StoredPhoto} from './property-photo-storage';
import type {ThumbnailWidth} from './photo-thumbnail-url';
import {createThumbnail,thumbnailKey} from './photo-image-processing';
export {createThumbnail,thumbnailKey} from './photo-image-processing';

// Called only after the route's original-photo access check. Derivatives stay in
// the same private storage backend and never receive a public object URL.
export async function readPhotoThumbnail(photo:StoredPhoto,width:ThumbnailWidth,storage?:PhotoObjectStorage){
 const objects=storage||photoStorage(photo.storage_backend||undefined);
 const hash=photo.checksum||(photo.content?checksum(Buffer.from(photo.content,'base64')):null);
 const sourceKey=photo.storage_key||(hash?`${photo.property_id}/${hash}.png`:null);
 if(!sourceKey)throw new Error('Photo bytes unavailable.');
 const key=thumbnailKey(sourceKey,width);
 try{return await objects.get(key);}catch{
  const bytes=await createThumbnail(await readPhoto(photo,objects),width);
  await objects.put(key,bytes,'image/webp');
  return bytes;
 }
}
