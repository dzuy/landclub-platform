/** One-time local-to-hosted transfer. Stop the dev server before running. Dry run by default. */
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {migrate} from './migrate.mjs';
const tables=['investor_source_snapshots','investment_entities','report_people','investment_holders','investor_access','investment_positions','investment_position_terms','investment_loans','investment_events','investor_reports','investor_report_lines','investor_report_schedules','investor_report_documents','investor_report_findings','investor_statement_snapshots','investor_import_batches','investor_operations_audit'];
const apply=process.argv.includes('--apply'),verify=process.argv.includes('--verify');
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required.');
const directory=path.resolve('.data/investor-platform'),backup=path.resolve('.data/backups',`investor-transfer-${new Date().toISOString().replace(/[:.]/g,'-')}`);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function rows(db,table,schema){
 const cols=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND data_type='numeric'",[schema,table])).rows;
 const numeric=cols.length?` || jsonb_build_object(${cols.map(c=>`'${c.column_name}',t."${c.column_name}"::text`).join(',')})`:'';
 return (await db.query(`SELECT to_jsonb(t)${numeric} AS row FROM "${schema}"."${table}" t`)).rows.map(v=>v.row);
}
const client=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000});let local;
try{
 await client.connect();await client.query('SET search_path TO land_club');
 if(verify){
  for(const table of [...tables,'investor_source_files'])console.log(table,(await client.query(`SELECT count(*) FROM "${table}"`)).rows[0].count);
  console.log('Released reports:',(await client.query('SELECT count(*) FROM investor_reports WHERE released_at IS NOT NULL')).rows[0].count);
  console.log('Linked logins:',(await client.query('SELECT count(*) FROM report_people WHERE auth_user_id IS NOT NULL')).rows[0].count);
 }else{
  // A consistent physical backup and portable row export are retained locally.
  await mkdir(backup,{recursive:true,mode:0o700});await cp(directory,path.join(backup,'local-database'),{recursive:true});
  local=new PGlite(directory);const data={};for(const table of tables)data[table]=await rows(local,table,'public');
  await writeFile(path.join(backup,'local-records.json'),JSON.stringify(data),{mode:0o600});
  const hosted={};for(const table of [...tables,'investor_source_files']){
   const exists=(await client.query('SELECT to_regclass($1) AS name',[`land_club.${table}`])).rows[0].name;
   hosted[table]=exists?await rows(client,table,'land_club'):[];
   if(hosted[table].length)throw new Error(`Target ${table} is not empty; refusing to overwrite or duplicate existing data.`);
  }
  hosted.migrations=(await client.query('SELECT * FROM schema_migrations ORDER BY name')).rows;
  await writeFile(path.join(backup,'hosted-before.json'),JSON.stringify(hosted),{mode:0o600});
  const manifest=JSON.parse(await readFile('.data/investor-review/workbooks.json','utf8'));
  const snapshot=data.investor_source_snapshots.find(s=>s.sha256===hash(JSON.stringify(manifest)));
  if(!snapshot)throw new Error('Original workbooks do not match an imported source snapshot.');
  const files=[];for(const book of manifest){
   if(path.basename(book.filename)!==book.filename||!book.filename.endsWith('.xlsx'))throw new Error('Invalid evidence filename.');
   const content=await readFile(path.join('.data/investor-review',book.filename));
   files.push({id:randomUUID(),snapshot_id:snapshot.id,filename:book.filename,sha256:hash(content),content:'\\x'+content.toString('hex')});
  }
  console.log(JSON.stringify({apply,backup,records:Object.fromEntries(tables.map(t=>[t,data[t].length])),originalFiles:files.length}));
  if(apply){
   await migrate(client);await client.query('BEGIN');
   try{
    await client.query('SELECT pg_advisory_xact_lock(73190232)');
    await client.query(`LOCK TABLE ${[...tables,'investor_source_files'].map(t=>`"${t}"`).join(',')} IN ACCESS EXCLUSIVE MODE`);
    for(const table of [...tables,'investor_source_files'])if((await client.query(`SELECT count(*) FROM "${table}"`)).rows[0].count!=='0')throw new Error('Hosted records changed; transfer aborted.');
    for(const table of tables){if(!data[table].length)continue;
     await client.query(`INSERT INTO "${table}" SELECT * FROM json_populate_recordset(NULL::"${table}",$1::json)`,[JSON.stringify(data[table])]);
     const actual=await rows(client,table,'land_club');
     const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
     const normalized=value=>JSON.stringify(canonical(value));
     if(JSON.stringify(actual.map(normalized).sort())!==JSON.stringify(data[table].map(normalized).sort()))throw new Error(`Round-trip verification failed: ${table}`);
    }
    for(const file of files)await client.query('INSERT INTO investor_source_files(id,snapshot_id,filename,sha256,content) VALUES($1,$2,$3,$4,$5)',[file.id,file.snapshot_id,file.filename,file.sha256,Buffer.from(file.content.slice(2),'hex')]);
    for(const f of (await client.query('SELECT sha256,content FROM investor_source_files')).rows)if(hash(f.content)!==f.sha256)throw new Error('Evidence checksum mismatch.');
    await client.query('INSERT INTO investor_operations_audit(id,actor_id,action,resource_id) VALUES($1,$2,$3,$4)',[randomUUID(),'operator:local-to-hosted-transfer','storage.transfer',snapshot.id]);
    await client.query('COMMIT');console.log('Transfer committed; all copied rows and original file hashes verified. Preview sessions intentionally excluded.');
   }catch(e){await client.query('ROLLBACK');throw e;}
  }
 }
}finally{if(local)await local.close();await client.end();}
