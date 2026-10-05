import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,rm,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';

export {MAX_PHOTO_BYTES,PHOTO_MIME_TYPES} from './photo-policy';
export interface PhotoObjectStorage {
 readonly backend:'local'|'supabase';
 put(key:string,bytes:Uint8Array,mime:string):Promise<void>;
 get(key:string):Promise<Uint8Array>;
}
export function checksum(bytes:Uint8Array){return createHash('sha256').update(bytes).digest('hex');}
export function validateObjectKey(key:string){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{64}\.(jpg|png|gif|webp)$/.test(key))throw new Error('Invalid photo object key.');
 return key;
}
export function localPhotoStorage(root=process.env.PHOTO_STORAGE_DIR||path.join(process.cwd(),'.data','property-photos')):PhotoObjectStorage {
 const base=path.resolve(root);
 async function location(key:string,create:boolean){
  validateObjectKey(key);
  const directory=path.join(base,path.dirname(key));
  if(create)await mkdir(directory,{recursive:true,mode:0o700});
  const actualRoot=await realpath(base),actualDirectory=await realpath(directory);
  if(actualDirectory!==path.join(actualRoot,path.dirname(key)))throw new Error('Photo directory must not be a symlink.');
  return path.join(actualDirectory,path.basename(key));
 }
 return {backend:'local',async put(key,bytes){
  const target=await location(key,true),temporary=target+'.'+randomUUID()+'.tmp';
  try{await writeFile(temporary,bytes,{flag:'wx',mode:0o600});await rename(temporary,target);}finally{await rm(temporary,{force:true});}
 },async get(key){
  const target=await location(key,false);
  if(await realpath(target)!==target)throw new Error('Photo must not be a symlink.');
  return readFile(target);
 }};
}
export function photoSupabaseClient(env:NodeJS.ProcessEnv=process.env){
 const url=env.SUPABASE_URL,key=env.SUPABASE_SECRET_KEY;
 if(!url||!key)throw new Error('Supabase photo storage requires server-side URL and secret key.');
 if(new URL(url).protocol!=='https:')throw new Error('Supabase photo storage requires HTTPS.');
 return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
}
export function supabasePhotoStorage(client:SupabaseClient,bucket='property-photos'):PhotoObjectStorage {
 const objects=client.storage.from(bucket);
 return {backend:'supabase',async put(key,bytes,mime){
  validateObjectKey(key);
  const {error}=await objects.upload(key,bytes,{contentType:mime,upsert:false,cacheControl:'0'});
  if(error){
   // A crashed/resumed run can already have written this immutable object.
   if(String(error.statusCode)!=='409')throw new Error('Photo object upload failed.');
   const {data,error:readError}=await objects.download(key);
   if(readError||!data||checksum(new Uint8Array(await data.arrayBuffer()))!==checksum(bytes))throw new Error('Existing photo object could not be verified.');
  }
 },async get(key){
  validateObjectKey(key);const {data,error}=await objects.download(key);
  if(error||!data)throw new Error('Photo object download failed.');
  return new Uint8Array(await data.arrayBuffer());
 }};
}
export function photoStorage(backend?:string):PhotoObjectStorage {
 const selected=backend||process.env.PHOTO_STORAGE_BACKEND||(process.env.NODE_ENV==='production'?'':'local');
 if(selected==='local'){
  if(process.env.NODE_ENV==='production')throw new Error('Production photo storage must use Supabase.');
  return localPhotoStorage();
 }
 if(selected==='supabase')return supabasePhotoStorage(photoSupabaseClient(),process.env.PHOTO_STORAGE_BUCKET||'property-photos');
 throw new Error('Set PHOTO_STORAGE_BACKEND=supabase for hosted photo storage.');
}
