import {readdir,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {localPhotoStorage,validateObjectKey} from '../src/lib/photo-object-storage';
import {createThumbnail,thumbnailKey} from '../src/lib/photo-thumbnails';
import {THUMBNAIL_WIDTHS} from '../src/lib/photo-thumbnail-url';

// Additive and resumable: scans object files without opening the live database.
async function main(){
 const args=process.argv.slice(2);
 if(args.some(arg=>!arg.startsWith('--storage-root=')))throw new Error('Use --storage-root=/absolute/path if needed.');
 const root=args[0]?.slice('--storage-root='.length)||process.env.PHOTO_STORAGE_DIR||path.join(process.cwd(),'.data/property-photos');
 const storage=localPhotoStorage(root);
 const totals={photos:0,originalBytes:0,over1MB:0,largestBytes:0,thumbnail160Bytes:0,thumbnail640Bytes:0};
 async function processPhoto(bytes:Uint8Array,read:(width:160|640)=>Promise<Uint8Array>,write:(width:160|640,bytes:Uint8Array)=>Promise<void>){
  totals.photos++;totals.originalBytes+=bytes.length;totals.largestBytes=Math.max(totals.largestBytes,bytes.length);if(bytes.length>1_000_000)totals.over1MB++;
  for(const width of THUMBNAIL_WIDTHS){
   let thumb:Uint8Array;
   try{thumb=await read(width);}catch{thumb=await createThumbnail(bytes,width);await write(width,thumb);}
   if(width===160)totals.thumbnail160Bytes+=thumb.length;else totals.thumbnail640Bytes+=thumb.length;
  }
 }
 let files:string[]=[];
 try{files=await readdir(root,{recursive:true});}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 for(const key of files.filter(key=>/\.(jpg|png|gif|webp)$/.test(key)&&!key.includes('.thumb-'))){
  validateObjectKey(key);
  await processPhoto(await storage.get(key),width=>storage.get(thumbnailKey(key,width)),(width,bytes)=>storage.put(thumbnailKey(key,width),bytes,'image/webp'));
 }
 const stored={...totals};
 for(const filename of ['cabin.jpg','coast.jpg','desert.jpg','farm.jpg','interior.jpg','landscape.png']){
  const source=path.join(process.cwd(),'public/images',filename);
  await stat(source);
  await processPhoto(await readFile(source),width=>readFile(thumbnailKey(source,width)),async(width,bytes)=>{await writeFile(thumbnailKey(source,width),bytes);});
 }
 console.log(JSON.stringify({storedPhotos:stored,includingPublicImages:totals},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
