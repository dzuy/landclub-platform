import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {embeddedDatabase} from '../src/lib/database';
import {InvestmentSharingRepository,type SharingActor,type SharingMail} from '../src/lib/investment-sharing';
import {InvestorReportRepository} from '../src/lib/investor-reports';
export async function sharingFixture(){
 const pg=new PGlite(),db=embeddedDatabase(pg);
 await pg.exec(await readFile(new URL('../migrations/001_property_content.sql',import.meta.url),'utf8'));
 for(const file of ['018_investor_reporting.sql','019_investor_operations.sql','027_investment_sharing.sql'])for(const sql of (await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8')).split('-- statement-break').filter(s=>s.trim()))await db.query(sql);
 const owner:SharingActor={id:randomUUID(),email:'owner@example.test',verified:true},existing:SharingActor={id:randomUUID(),email:'existing@example.test',verified:true},fresh:SharingActor={id:randomUUID(),email:'new@example.test',verified:true},outsider:SharingActor={id:randomUUID(),email:'unrelated@example.test',verified:true};
 const people={owner:randomUUID(),existing:randomUUID()},holder=randomUUID(),otherHolder=randomUUID();
 await db.query("INSERT INTO report_people(id,auth_user_id,display_name) VALUES($1,$2,'Synthetic Owner'),($3,$4,'Synthetic Existing Member')",[people.owner,owner.id,people.existing,existing.id]);
 await db.query("INSERT INTO investment_holders(id,name) VALUES($1,'Synthetic Family Investments'),($2,'Recipient Own Holdings')",[holder,otherHolder]);
 await db.query("INSERT INTO investor_access(person_id,holder_id,granted_by) VALUES($1,$2,'fixture'),($3,$4,'fixture')",[people.owner,holder,people.existing,otherHolder]);

 const positions=[randomUUID(),randomUUID(),randomUUID()],reports=[randomUUID(),randomUUID(),randomUUID()],document=randomUUID();
 for(let i=0;i<3;i++){
  await db.query("INSERT INTO investment_positions(id,holder_id,project_name,name,kind) VALUES($1,$2,$3,'Equity account','equity')",[positions[i],i===2?otherHolder:holder,['Synthetic Orchard','Synthetic Ridge','My Separate Investment'][i]]);
  await db.query("INSERT INTO investor_reports(id,position_id,title,source_reference,review_state,released_at,released_by) VALUES($1,$2,'Quarterly report','synthetic fixture','reviewed',now(),'fixture')",[reports[i],positions[i]]);
  await db.query("INSERT INTO investor_report_lines(id,report_id,section,label,amount,basis,source_reference) VALUES($1,$2,'position','Reported capital',10000,'reported','synthetic fixture')",[randomUUID(),reports[i]]);
 }
 await db.query("INSERT INTO investor_report_documents(id,report_id,filename,content) VALUES($1,$2,'synthetic-investment.txt',$3)",[document,reports[0],Buffer.from('Synthetic investment document only')]);
 // Authoritative source ownership, separate from generic viewing access.
 const snapshot=randomUUID(),digest='f'.repeat(64);
 const payload=[{filename:'ownership.xlsx',tabs:[{name:'investor_access',rows:[{person_id:'PER-OWNER',investor_id:'HOLDER-OWNER',access_role:'owner'},{person_id:'PER-EXISTING',investor_id:'HOLDER-EXISTING',access_role:'owner'}]}]}];
 await db.query("UPDATE report_people SET source_id='PER-OWNER' WHERE id=$1",[people.owner]);
 await db.query("UPDATE report_people SET source_id='PER-EXISTING' WHERE id=$1",[people.existing]);
 await db.query("UPDATE investment_holders SET source_id='HOLDER-OWNER' WHERE id=$1",[holder]);
 await db.query("UPDATE investment_holders SET source_id='HOLDER-EXISTING' WHERE id=$1",[otherHolder]);
 await db.query("INSERT INTO investor_source_snapshots(id,source_key,sha256,source_filename,payload) VALUES($1,'ownership-fixture',$2,'ownership.xlsx',$3)",[snapshot,digest,JSON.stringify(payload)]);
 await db.query("INSERT INTO investor_import_batches(id,digest,source_key,actor_id,summary) VALUES($1,$2,'ownership-fixture','fixture','{}')",[randomUUID(),digest]);
 for(let i=0;i<positions.length;i++){await db.query('UPDATE investment_positions SET source_id=$2 WHERE id=$1',[positions[i],`POSITION-${i}`]);await db.query('INSERT INTO investment_position_terms(position_id,snapshot_id,source_fields) VALUES($1,$2,$3)',[positions[i],snapshot,JSON.stringify({position_id:`POSITION-${i}`,investor_id:i===2?'HOLDER-EXISTING':'HOLDER-OWNER'})]);}
 const mail:SharingMail[]=[],capture=async(m:SharingMail)=>{mail.push(m);},repo=new InvestmentSharingRepository(db),shared=new InvestorReportRepository(db,{person:false,draft:false,shared:true}),ordinary=new InvestorReportRepository(db);
 return {pg,db,repo,shared,ordinary,owner,existing,fresh,outsider,people,holder,positions,reports,document,mail,capture};
}
