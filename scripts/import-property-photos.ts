import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {importPropertyPhotos} from '../src/lib/import-property-photos';
import {initializePhotoStorage,migrateLegacyPhotos} from '../src/lib/property-photo-storage';
import {localPhotoStorage} from '../src/lib/photo-object-storage';
async function main(){
 const args=process.argv.slice(2),value=(name:string)=>args.find(v=>v.startsWith(name+'='))?.slice(name.length+1);
 if(args.some(v=>!/^--(local|source-root|manifest|storage-root)=/.test(v)&&!['--apply','--migrate-legacy','--offline-confirmed'].includes(v)))throw new Error('Unknown argument.');
 const databasePath=value('--local'),storageRoot=value('--storage-root'),sourceRoot=value('--source-root'),manifestPath=value('--manifest');
 if(!databasePath||!path.isAbsolute(databasePath)||!storageRoot||!path.isAbsolute(storageRoot))throw new Error('Provide explicit absolute --local and --storage-root paths.');
 // PGlite is single-process. Do not open the app database while Next.js is using it.
 if(!args.includes('--offline-confirmed'))throw new Error('Stop the local app first, then pass --offline-confirmed.');
 if(!(await stat(databasePath)).isDirectory()||!(await stat(path.join(databasePath,'PG_VERSION'))).isFile())throw new Error('Local database must already exist.');
 const legacy=args.includes('--migrate-legacy');
 if(!legacy&&(!sourceRoot||!manifestPath))throw new Error('Provide --manifest and --source-root.');
 if(legacy&&(sourceRoot||manifestPath))throw new Error('Legacy migration and manifest import are separate operations.');
 const input=manifestPath?JSON.parse(await readFile(manifestPath,'utf8')):undefined;
 const pg=new PGlite(databasePath),db=embeddedDatabase(pg),storage=localPhotoStorage(storageRoot),apply=args.includes('--apply');
 try{
  if(apply)await initializePhotoStorage(db);
  const run=(connection:typeof db)=>legacy?migrateLegacyPhotos(connection,storage,apply):importPropertyPhotos(connection,input,sourceRoot!,storage,apply);
  const result=apply?await run(db):await db.transaction(async tx=>{
   await tx.query('SET TRANSACTION READ ONLY');
   return run({...tx,transaction:async work=>work(tx)});
  });
  console.log(JSON.stringify(result));
 }finally{await pg.close();}
}
main().catch(()=>{console.error('Photo import stopped. Check the manifest, paths, migrations and access; no photos were published. Completed items are resumable.');process.exitCode=1;});
