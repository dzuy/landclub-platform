import pg from 'pg';
import {randomUUID} from 'node:crypto';
// Only the two owner-specific extracts explicitly requested by the user are enrolled.
const documents=[
 ['PER-001','1d019c21-445d-474a-8dae-59dfa27ef776'],
 ['PER-007','601bd2a2-3753-4804-bbea-7d460b9f1b06'],
];
const db=new pg.Client({connectionString:process.env.DATABASE_URL,options:'-c search_path=land_club'});
try{
 await db.connect();await db.query('BEGIN');
 for(const [source,document] of documents){
  const person=(await db.query('SELECT id,prepared_member_id,auth_user_id FROM report_people WHERE source_id=$1 AND disabled_at IS NULL',[source])).rows[0];
  const doc=(await db.query('SELECT member_id FROM member_documents WHERE id=$1',[document])).rows[0];
  if(!person||!doc||![person.prepared_member_id,person.auth_user_id].includes(doc.member_id))throw new Error('Explicit document ownership mismatch');
  const existing=(await db.query('SELECT person_id FROM automatic_investor_documents WHERE document_id=$1',[document])).rows[0];
  if(existing){if(existing.person_id!==person.id)throw new Error('Conflicting document binding');continue;}
  await db.query('INSERT INTO automatic_investor_documents(document_id,person_id) VALUES($1,$2)',[document,person.id]);
  await db.query('INSERT INTO investor_operations_audit(id,actor_id,action,resource_id,person_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),'user-request:automatic-investor-documents','private-workbook.enable-auto-refresh',document,person.id]);
 }
 await db.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');
 console.log(process.argv.includes('--apply')?'Automatic refresh enabled for Ian and Scott.':'Validated identity bindings; dry run rolled back.');
}catch(error){await db.query('ROLLBACK').catch(()=>{});throw error;}finally{await db.end();}
