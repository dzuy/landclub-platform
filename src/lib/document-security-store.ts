import 'server-only';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {database} from './database';
import {preparedMemberStore} from './prepared-member-store';
import {memberPropertyStore} from './member-property-store';
import {InvitationRepository} from './invitations';
const state=globalThis as unknown as {documentSecurityReady?:Promise<void>};
export async function initializeDocumentSecurity(){
 if(process.env.DATABASE_URL||process.env.NODE_ENV!=='development')return;
 if(!state.documentSecurityReady)state.documentSecurityReady=(async()=>{
  await preparedMemberStore();await memberPropertyStore();await new InvitationRepository(database()).initialize();
  await database().transaction(async tx=>{
   for(const file of ['012_member_documents.sql','013_group_documents.sql','017_document_audit.sql']){
    const sql=await readFile(path.join(process.cwd(),'migrations',file),'utf8');
    for(const statement of sql.split(file.startsWith('017')?'-- statement-break':';').filter(s=>s.trim()))await tx.query(statement);
   }
  });
 })().catch(error=>{state.documentSecurityReady=undefined;throw error;});
 await state.documentSecurityReady;
}
