import pg from 'pg';
import {randomUUID} from 'node:crypto';
// Reviewed links between Nathan's source IDs and the existing prepared member records.
// These links grant no property access and do not create or invite auth accounts.
const links=[['PER-001','f1f5be53-a218-499a-8e72-d754dbec2afb','Ian Kenny'],['PER-007','37a33680-f8dd-43e2-bb0b-9abb334ba0d9','Scott Jeeves']];
const client=new pg.Client({connectionString:process.env.DATABASE_URL,options:'-c search_path=land_club'});
try{
 await client.connect();await client.query('BEGIN');
 for(const [source,id,name] of links){
  const prepared=(await client.query('SELECT info FROM prepared_members WHERE id=$1',[id])).rows[0];
  if(prepared?.info?.displayName!==name)throw new Error(`Prepared identity check failed: ${source}`);
  const person=(await client.query('SELECT id,prepared_member_id FROM report_people WHERE source_id=$1 FOR UPDATE',[source])).rows[0];
  if(!person||person.prepared_member_id&&person.prepared_member_id!==id)throw new Error(`Existing mapping conflict: ${source}`);
  if(person.prepared_member_id===id)continue;
  await client.query('UPDATE report_people SET prepared_member_id=$2 WHERE id=$1',[person.id,id]);
  await client.query('INSERT INTO investor_operations_audit(id,actor_id,action,resource_id,person_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),'local-developer','identity.link-prepared-member',id,person.id]);
 }
 await client.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');console.log(process.argv.includes('--apply')?'Prepared preview identities linked.':'Identity links validated; dry run rolled back.');
}catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{await client.end();}
