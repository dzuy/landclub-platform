import {importPropertyRecords} from '../src/lib/import-property-records';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {Pool} from 'pg';
import {embeddedDatabase,type Database} from '../src/lib/database';
import {PropertyRepository} from '../src/lib/repository';
import {mapNotionProperty,mergeNotionDraft} from '../src/lib/notion-property-import';
import {readDraft} from '../src/lib/schema';
import seeds from '../src/lib/seed-properties.json';
async function main(){
 const apply=process.argv.includes('--apply');
 // Explicit destination prevents accidentally importing into a production DATABASE_URL.
 const destination=process.argv.find(v=>v.startsWith('--local='))?.slice(8);
 const remote=process.argv.includes('--database-url');
 if(Boolean(destination)===remote)throw new Error('Choose --local=/absolute/database/path OR --database-url. Dry run by default; add --apply to import drafts.');
 let close:()=>Promise<void>,db:Database;
 if(destination){const pglite=new PGlite(path.resolve(destination));db=embeddedDatabase(pglite);close=()=>pglite.close();}
 else{if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured.');const pool=new Pool({connectionString:process.env.DATABASE_URL,options:'-c search_path=land_club'});db={query:async(sql,params)=>({rows:(await pool.query(sql,params)).rows}),transaction:async work=>{const c=await pool.connect();try{await c.query('BEGIN');const result=await work({query:async(sql,params)=>({rows:(await c.query(sql,params)).rows})});await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}};close=()=>pool.end();}
 try{
 const repo=new PropertyRepository(db);if(apply)await repo.initialize();
 const records=await repo.list();
 if(apply){await mkdir('.data/import-backups',{recursive:true});await writeFile(`.data/import-backups/properties-${Date.now()}.json`,JSON.stringify(records,null,2),{mode:0o600});}
 const rows=JSON.parse(await readFile(new URL('../data/notion-properties-2026-09-23.json',import.meta.url),'utf8'));
 const result=await importPropertyRecords(repo,rows,'notion-initial-import',apply);
 console.log(JSON.stringify({mode:apply?'applied':'dry-run',...result}));
 }finally{await close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
