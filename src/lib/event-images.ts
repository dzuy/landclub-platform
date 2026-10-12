import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {checksum,photoStorage} from './photo-object-storage';
import {MAX_PHOTO_BYTES} from './photo-policy';
export async function saveEventImage(bytes:Uint8Array){
 if(!bytes.length||bytes.length>MAX_PHOTO_BYTES)throw new Error('Invalid image size.');
 const image=sharp(bytes,{limitInputPixels:40000000});const meta=await image.metadata();
 if(!['jpeg','png','webp','gif'].includes(meta.format||''))throw new Error('Unsupported image.');
 const output=await image.rotate().resize({width:1600,height:1000,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
 const key=`${randomUUID()}/${checksum(output)}.webp`;await photoStorage().put(key,output,'image/webp');
 return `/api/event-images/${key}`;
}
