import sharp from 'sharp';
import {checksum,type PhotoObjectStorage} from './photo-object-storage';
import {MAX_PROFILE_PHOTO_BYTES} from './profile-photo';
export async function saveProfilePhoto(userId:string,input:Uint8Array,storage:PhotoObjectStorage){
 if(!/^[0-9a-f-]{36}$/.test(userId)||!input.length||input.length>MAX_PROFILE_PHOTO_BYTES)throw new Error('Invalid profile photo.');
 const image=sharp(input,{limitInputPixels:40_000_000});
 const metadata=await image.metadata();
 if(!['jpeg','png','webp','gif'].includes(metadata.format||''))throw new Error('Unsupported photo format.');
 const bytes=await image.rotate().resize(512,512,{fit:'cover',withoutEnlargement:true}).webp({quality:80,effort:4}).toBuffer();
 const key=`${userId}/${checksum(bytes)}.webp`;
 await storage.put(key,bytes,'image/webp');
 if(checksum(await storage.get(key))!==checksum(bytes))throw new Error('Photo verification failed.');
 return key;
}
