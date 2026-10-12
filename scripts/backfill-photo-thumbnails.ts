import {loadEnvConfig} from '@next/env';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {database} from '../src/lib/database';
import {readPhoto,type StoredPhoto} from '../src/lib/property-photo-storage';
import {photoStorage,checksum} from '../src/lib/photo-object-storage';
import {createThumbnail,thumbnailKey} from '../src/lib/photo-image-processing';
import {THUMBNAIL_WIDTHS} from '../src/lib/photo-thumbnail-url';

// Additive and resumable. Run against the configured hosted database/storage.
async function main(){
 loadEnvConfig(process.cwd());
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required; use photos:optimize for offline local storage.');
 const photos=(await database().query<StoredPhoto>('SELECT * FROM property_photos ORDER BY id')).rows;
 const totals={photos:photos.length,publicImages:0,created:0,verified:0,bytes:0,failures:[] as string[]};
 async function ensure(read:(width:160|640)=>Promise<Uint8Array>,write:(width:160|640,bytes:Uint8Array)=>Promise<void>,original:()=>Promise<Uint8Array>){
  let source:Uint8Array|undefined;
  for(const width of THUMBNAIL_WIDTHS){
   let bytes:Uint8Array;
   try{bytes=await read(width);}catch{source??=await original();bytes=await createThumbnail(source,width);await write(width,bytes);bytes=await read(width);totals.created++;}
   const meta=await sharp(bytes).metadata();
   if(meta.format!=='webp'||!meta.width||!meta.height||Math.max(meta.width,meta.height)>width)throw new Error('Invalid thumbnail');
   totals.verified++;totals.bytes+=bytes.length;
  }
 }
 let cursor=0,completed=0;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<photos.length){const photo=photos[cursor++];try{
  const storage=photoStorage(photo.storage_backend||undefined);
  const hash=photo.checksum||(photo.content?checksum(Buffer.from(photo.content,'base64')):null);
  const key=photo.storage_key||(hash?`${photo.property_id}/${hash}.png`:null);
  if(!key)throw new Error('Missing photo source');
  await ensure(width=>storage.get(thumbnailKey(key,width)),(width,bytes)=>storage.put(thumbnailKey(key,width),bytes,'image/webp'),()=>readPhoto(photo,storage));
 }catch{totals.failures.push(photo.id);}completed++;if(completed%25===0)console.log(`Verified ${completed}/${photos.length} photos`);}}));
 for(const name of ['cabin.jpg','coast.jpg','desert.jpg','farm.jpg','interior.jpg','landscape.png']){
  const source=path.join(process.cwd(),'public/images',name);
  try{await ensure(width=>readFile(thumbnailKey(source,width)),async(width,bytes)=>{await writeFile(thumbnailKey(source,width),bytes);},()=>readFile(source));totals.publicImages++;}catch{totals.failures.push(name);}
 }
 console.log(JSON.stringify(totals,null,2));process.exit(totals.failures.length?1:0);
}
main().catch(error=>{console.error(error.message);process.exit(1);});
