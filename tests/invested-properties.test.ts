import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {investedPropertyIds,mergePropertyRoles} from '../src/lib/invested-properties';

test('investment properties derive without manual associations, isolate people, and follow revocation and linked accounts',async()=>{
 const pg=new PGlite();try{
 await pg.exec('CREATE TABLE properties(id uuid PRIMARY KEY); CREATE TABLE prepared_members(id uuid PRIMARY KEY,auth_user_id uuid)');
 for(const name of ['018_investor_reporting.sql','019_investor_operations.sql','021_dashboard_preview.sql','022_investment_property_links.sql'])await pg.exec(await readFile(new URL(`../migrations/${name}`,import.meta.url),'utf8'));
 const db=embeddedDatabase(pg),member=randomUUID(),person=randomUUID(),holder=randomUUID(),entity=randomUUID(),property=randomUUID();
 await pg.query('INSERT INTO properties VALUES($1)',[property]);await pg.query('INSERT INTO prepared_members VALUES($1,NULL)',[member]);
 await pg.query('INSERT INTO report_people(id,prepared_member_id) VALUES($1,$2)',[person,member]);
 await pg.query("INSERT INTO investment_holders(id,name) VALUES($1,'Trust')",[holder]);
 await pg.query("INSERT INTO investment_entities(id,name,property_id) VALUES($1,'Project',$2)",[entity,property]);
 await pg.query("INSERT INTO investor_access(person_id,holder_id,granted_by) VALUES($1,$2,'test')",[person,holder]);
 const position=randomUUID();await pg.query("INSERT INTO investment_positions(id,holder_id,entity_id,project_name,name,kind) VALUES($1,$2,$3,'Project','Position','equity')",[position,holder,entity]);
 assert.deepEqual(await investedPropertyIds(db,member),[property]);assert.deepEqual(await investedPropertyIds(db,randomUUID()),[]);
 await pg.query("UPDATE investment_positions SET kind='reserve'");assert.deepEqual(await investedPropertyIds(db,member),[]);
 await pg.query("UPDATE investment_positions SET kind='loan'");assert.deepEqual(await investedPropertyIds(db,member),[property]);
 await pg.query('UPDATE investor_access SET revoked_at=now()');assert.deepEqual(await investedPropertyIds(db,member),[]);
 await pg.query('UPDATE investor_access SET revoked_at=NULL');await pg.query('UPDATE report_people SET disabled_at=now()');assert.deepEqual(await investedPropertyIds(db,member),[]);
 await pg.query('UPDATE report_people SET disabled_at=NULL');
 const user=randomUUID();await pg.query('UPDATE prepared_members SET auth_user_id=$1',[user]);
 assert.deepEqual(await investedPropertyIds(db,member),[]);assert.deepEqual(await investedPropertyIds(db,user),[property]);
 await pg.query('UPDATE report_people SET auth_user_id=$1',[randomUUID()]);assert.deepEqual(await investedPropertyIds(db,user),[]);
 }finally{await pg.close();}
});
test('manual property roles survive and investments are deduplicated',()=>{
 assert.deepEqual(mergePropertyRoles([{property_id:'one',roles:['owner']},{property_id:'two',roles:['investor']}],['one','two','three','three']),[{property_id:'one',roles:['owner','investor']},{property_id:'two',roles:['investor']},{property_id:'three',roles:['investor']}]);
});
