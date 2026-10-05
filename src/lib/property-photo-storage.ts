import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import type {Database,Queryable} from './database';
import {checksum,MAX_PHOTO_BYTES,photoStorage,type PhotoObjectStorage} from './photo-object-storage';
import {PHOTO_SIZE_LABEL} from './photo-policy';
export {MAX_PHOTO_BYTES} from './photo-object-storage';
// Kept for callers upgrading the original local upload implementation.
export const photoMigration=`CREATE TABLE IF NOT EXISTS property_photos (id uuid PRIMARY KEY,property_id uuid NOT NULL REFERENCES properties(id),mime text NOT NULL,content text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());`;
export async function initializePhotoStorage(db:Database){
 const sql=await readFile(new URL('../../migrations/011_property_photo_objects.sql',import.meta.url),'utf8');
 await db.transaction(async tx=>{
  await tx.query(photoMigration);
  for(const statement of sql.split(';').filter(part=>part.trim()))await tx.query(statement);
 });
}
export function photoMime(bytes:Uint8Array){
 if(bytes.length<12)return null;
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
 const prefix=Buffer.from(bytes.subarray(0,12)).toString('ascii');
 if(prefix.startsWith('GIF87a')||prefix.startsWith('GIF89a'))return 'image/gif';
 if(prefix.startsWith('RIFF')&&prefix.slice(8)==='WEBP')return 'image/webp';
 return null;
}
export function inspectPhoto(bytes:Uint8Array){
 const mime=photoMime(bytes);
 if(!mime||bytes.length>MAX_PHOTO_BYTES)throw new Error(`Use a JPG, PNG, WebP or GIF up to ${PHOTO_SIZE_LABEL}.`);
 return {mime,checksum:checksum(bytes),size:bytes.length};
}
export type StoredPhoto={id:string;property_id:string;mime:string;content:string|null;storage_backend:string|null;storage_key:string|null;checksum:string|null;byte_size:number|null;staff_only:boolean};
export type PhotoSource={system:string;id:string};
export type SavePhotoOptions={storage?:PhotoObjectStorage;originalFilename?:string;source?:PhotoSource;staffOnly?:boolean};
export const photoUrl=(id:string)=>'/api/property-photos/'+id;
export function objectKey(propertyId:string,hash:string,mime:string){
 const extensions:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp'};
 return `${propertyId}/${hash}.${extensions[mime]}`;
}
export async function findPhoto(db:Queryable,propertyId:string,hash:string,staffOnly:boolean,source?:PhotoSource){
 if(source){
  const prior=(await db.query<StoredPhoto>('SELECT p.* FROM property_photos p JOIN property_photo_sources s ON s.photo_id=p.id WHERE s.property_id=$1 AND s.source_system=$2 AND s.source_id=$3',[propertyId,source.system,source.id])).rows[0];
  if(prior){if(prior.checksum!==hash||prior.staff_only!==staffOnly)throw new Error('Source already imported with different content or access. Review the mapping before retrying.');return prior;}
 }
 return (await db.query<StoredPhoto>('SELECT * FROM property_photos WHERE property_id=$1 AND checksum=$2 AND staff_only=$3',[propertyId,hash,staffOnly])).rows[0];
}
export async function savePhoto(db:Database,propertyId:string,bytes:Uint8Array,options:SavePhotoOptions={}){
 const info=inspectPhoto(bytes),staffOnly=options.staffOnly??false;
 return db.transaction(async tx=>{
  if(!(await tx.query('SELECT id FROM properties WHERE id=$1 FOR UPDATE',[propertyId])).rows.length)throw new Error('Property not found.');
  let photo=await findPhoto(tx,propertyId,info.checksum,staffOnly,options.source);
  if(!photo){
   const storage=options.storage||photoStorage(),key=objectKey(propertyId,info.checksum,info.mime),id=randomUUID();
   await storage.put(key,bytes,info.mime);
   if(checksum(await storage.get(key))!==info.checksum)throw new Error('Photo write verification failed.');
   photo=(await tx.query<StoredPhoto>('INSERT INTO property_photos(id,property_id,mime,content,storage_backend,storage_key,byte_size,checksum,original_filename,staff_only) VALUES($1,$2,$3,NULL,$4,$5,$6,$7,$8,$9) RETURNING *',[id,propertyId,info.mime,storage.backend,key,info.size,info.checksum,options.originalFilename?.slice(0,255)||null,staffOnly])).rows[0];
  }
  if(options.source)await tx.query('INSERT INTO property_photo_sources(property_id,source_system,source_id,photo_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[propertyId,options.source.system,options.source.id,photo.id]);
  return {id:photo.id,url:photoUrl(photo.id)};
 });
}
export async function readPhoto(photo:StoredPhoto,storage?:PhotoObjectStorage){
 if(photo.storage_key&&photo.storage_backend){
  const bytes=await (storage||photoStorage(photo.storage_backend)).get(photo.storage_key);
  const expected=photo.checksum||(photo.content?checksum(Buffer.from(photo.content,'base64')):null);
  if(expected&&checksum(bytes)!==expected)throw new Error('Photo integrity check failed.');
  return bytes;
 }
 if(photo.content!==null)return Buffer.from(photo.content,'base64');
 throw new Error('Photo bytes unavailable.');
}
export function mayReadPhoto(photo:Pick<StoredPhoto,'staff_only'>,staff:boolean,published:boolean){return staff||(!photo.staff_only&&published);}
// Explicit, resumable copy. Legacy bytes remain as a backup, including after success.
export async function migrateLegacyPhotos(db:Database,storage:PhotoObjectStorage,apply=false){
 const rows=(await db.query<StoredPhoto>("SELECT * FROM property_photos WHERE content IS NOT NULL AND (to_jsonb(property_photos)->>'storage_key') IS NULL ORDER BY id")).rows;
 for(const row of rows){
  const bytes=Buffer.from(row.content!,'base64'),info=inspectPhoto(bytes),key=objectKey(row.property_id,info.checksum,info.mime);
  if(!apply)continue;
  await storage.put(key,bytes,info.mime);
  if(checksum(await storage.get(key))!==info.checksum)throw new Error('Legacy photo copy verification failed.');
  // Legacy duplicate rows keep their identities. The digest index applies to new rows;
  // duplicate legacy rows retain NULL checksum while still recording size and location.
  await db.query(`UPDATE property_photos SET storage_backend=$1,storage_key=$2,byte_size=$3,
   checksum=CASE WHEN EXISTS(SELECT 1 FROM property_photos p WHERE p.property_id=$4 AND p.checksum=$5 AND p.staff_only=$6 AND p.id<>$7) THEN NULL ELSE $5 END
   WHERE id=$7 AND storage_key IS NULL`,[storage.backend,key,info.size,row.property_id,info.checksum,row.staff_only,row.id]);
 }
 return {mode:apply?'applied':'dry-run',photos:rows.length};
}
