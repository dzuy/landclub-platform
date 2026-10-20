import 'server-only';
import {PGlite} from '@electric-sql/pglite';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {database,embeddedDatabase,type Database} from './database';
const state=globalThis as unknown as {investorPlatformDb?:Promise<Database>};
/** Use the shared hosted database whenever configured; local storage is offline-only. */
export async function investorPlatformDatabase():Promise<Database>{
 if(process.env.DATABASE_URL||process.env.NODE_ENV!=='development')return database();
 state.investorPlatformDb??=(async()=>{
  await mkdir(path.join(process.cwd(),'.data'),{recursive:true});
  const db=embeddedDatabase(new PGlite(path.join(process.cwd(),'.data','investor-platform')));
  await db.query('CREATE TABLE IF NOT EXISTS properties(id uuid PRIMARY KEY)');
  for(const name of ['018_investor_reporting.sql','019_investor_operations.sql','020_investor_source_files.sql','021_dashboard_preview.sql','022_investment_property_links.sql']){
   const sql=await readFile(path.join(process.cwd(),'migrations',name),'utf8');
   await db.transaction(async tx=>{for(const s of sql.split('-- statement-break').filter(s=>s.trim()))await tx.query(s);});
  }
  return db;
 })().catch(e=>{state.investorPlatformDb=undefined;throw e;});
 return state.investorPlatformDb;
}
