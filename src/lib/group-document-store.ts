import 'server-only';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {database} from './database';
import {memberPropertyStore} from './member-property-store';
import {GroupDocumentRepository} from './group-documents';
const state=globalThis as unknown as {groupDocumentsReady?:Promise<void>};
export async function groupDocumentStore(){
 const db=database();
 if(!process.env.DATABASE_URL&&process.env.NODE_ENV==='development'){
  if(!state.groupDocumentsReady)state.groupDocumentsReady=(async()=>{
   await memberPropertyStore();const sql=await readFile(path.join(process.cwd(),'migrations/013_group_documents.sql'),'utf8');
   await db.transaction(async tx=>{for(const statement of sql.split(';').filter(s=>s.trim()))await tx.query(statement);});
  })().catch(error=>{state.groupDocumentsReady=undefined;throw error;});
  await state.groupDocumentsReady;
 }
 return new GroupDocumentRepository(db);
}
