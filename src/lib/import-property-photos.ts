import {open,realpath} from 'node:fs/promises';
import path from 'node:path';
import {PHOTO_SIZE_LABEL} from './photo-policy';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database,Queryable} from './database';
import {PropertyRepository} from './repository';
import {readDraft} from './schema';
import {findPhoto,inspectPhoto,MAX_PHOTO_BYTES,photoUrl,savePhoto,type StoredPhoto} from './property-photo-storage';
import type {PhotoObjectStorage} from './photo-object-storage';
export const photoImportManifest=z.object({version:z.literal(1),photos:z.array(z.object({
 propertyId:z.uuid(),file:z.string().min(1),source:z.object({system:z.literal('drive'),id:z.string().trim().min(1).max(300)}),alt:z.string().trim().min(1).max(300)
 }).strict()).min(1).max(10000)}).strict();
export type PhotoImportManifest=z.infer<typeof photoImportManifest>;
export async function readImportPhoto(root:string,file:string){
 if(path.isAbsolute(file))throw new Error('Manifest files must be relative to the explicit source root.');
 const base=await realpath(root),target=await realpath(path.resolve(base,file));
 if(!target.startsWith(base+path.sep))throw new Error('Import file escapes the source root.');
 const handle=await open(target,'r');
 try{const stat=await handle.stat();if(!stat.isFile()||stat.size>MAX_PHOTO_BYTES)throw new Error(`Import file must be a photo up to ${PHOTO_SIZE_LABEL}.`);return new Uint8Array(await handle.readFile());}finally{await handle.close();}
}
async function schemaReady(db:Queryable){
 return (await db.query<{ready:boolean}>("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='property_photos' AND column_name='staff_only') AS ready")).rows[0].ready;
}
export async function importPropertyPhotos(db:Database,input:unknown,sourceRoot:string,storage:PhotoObjectStorage,apply=false){
 const manifest=photoImportManifest.parse(input),repo=new PropertyRepository(db),ready=await schemaReady(db);
 if(apply&&!ready)throw new Error('Apply photo migrations before importing.');
 const prepared: {item:PhotoImportManifest['photos'][number];hash:string;existing?:StoredPhoto}[]=[];
 const sourceHashes=new Map<string,string>();
 // Validate the entire plan before any writes. Do not infer destination properties from names.
 const previews=new Map<string,Awaited<ReturnType<typeof repo.get>>>();
 const plannedUrls=new Map<string,string>();
 for(const item of manifest.photos){
  const info=inspectPhoto(await readImportPhoto(sourceRoot,item.file));
  const identity=JSON.stringify([item.propertyId,item.source.system,item.source.id]);
  if(sourceHashes.has(identity)&&sourceHashes.get(identity)!==info.checksum)throw new Error('Manifest repeats a source ID with different bytes.');
  sourceHashes.set(identity,info.checksum);
  const existing=ready?await findPhoto(db,item.propertyId,info.checksum,true,item.source):undefined;
  const p=previews.has(item.propertyId)?previews.get(item.propertyId):await repo.get(item.propertyId);
  if(!p)throw new Error('A mapped property does not exist.');
  const dedupKey=item.propertyId+':'+info.checksum,id=existing?.id||plannedUrls.get(dedupKey)||randomUUID();plannedUrls.set(dedupKey,id);
  const url=photoUrl(id);
  if(!p.draft.media.some(m=>m.url===url))p.draft=readDraft({...p.draft,media:[...p.draft.media,{id,role:'gallery',kind:'image',url,alt:item.alt,caption:'',state:'Actual'}]});
  previews.set(item.propertyId,p);prepared.push({item,hash:info.checksum,existing});
 }
 const result={mode:apply?'applied':'dry-run',files:prepared.length,newPhotos:new Set(prepared.filter(p=>!p.existing).map(p=>p.item.propertyId+':'+p.hash)).size,reusedPhotos:prepared.filter(p=>p.existing).length,properties:previews.size,published:0,staffOnly:true,mapping:manifest.photos.map(item=>({propertyId:item.propertyId,file:item.file,sourceId:item.source.id}))};
 if(!apply)return result;
 for(const {item,hash} of prepared){
  const bytes=await readImportPhoto(sourceRoot,item.file);
  if(inspectPhoto(bytes).checksum!==hash)throw new Error('Source file changed after preflight. Rerun the import.');
  await db.transaction(async tx=>{
   await tx.query('SELECT id FROM properties WHERE id=$1 FOR UPDATE',[item.propertyId]);
   const transactional:Database={...tx,transaction:async work=>work(tx)},lockedRepo=new PropertyRepository(transactional);
   const p=await lockedRepo.get(item.propertyId);if(!p)throw new Error('Mapped property was removed.');
   const photo=await savePhoto(transactional,p.id,bytes,{storage,staffOnly:true,source:item.source,originalFilename:path.basename(item.file)});
   if(!p.draft.media.some(m=>m.url===photo.url))await lockedRepo.save(p.id,p.version,{...p.draft,media:[...p.draft.media,{id:photo.id,role:'gallery',kind:'image',url:photo.url,alt:item.alt,caption:'',state:'Actual'}]},'photo-import');
  });
 }
 return result;
}
