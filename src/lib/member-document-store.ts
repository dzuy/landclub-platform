import 'server-only';
import {readFile} from 'node:fs/promises';
import {database} from './database';
import {preparedMemberStore} from './prepared-member-store';
import {MemberDocumentRepository} from './member-documents';
const state=globalThis as unknown as {memberDocumentsReady?:Promise<void>};
export async function memberDocumentStore(){
 const db=database();
 if(!process.env.DATABASE_URL&&process.env.NODE_ENV==='development'){
  if(!state.memberDocumentsReady)state.memberDocumentsReady=(async()=>{
   await preparedMemberStore();
   const sql=await readFile(new URL('../../migrations/012_member_documents.sql',import.meta.url),'utf8');
   await db.transaction(async tx=>{for(const statement of sql.split(';').filter(s=>s.trim()))await tx.query(statement);});
  })().catch(error=>{state.memberDocumentsReady=undefined;throw error;});
  await state.memberDocumentsReady;
 }
 return new MemberDocumentRepository(db);
}
