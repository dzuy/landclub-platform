import pg from 'pg';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export async function migrate(client){
 await client.query('SELECT pg_advisory_lock(73190231)');
 try{
  await client.query('CREATE SCHEMA IF NOT EXISTS land_club');
  await client.query('REVOKE ALL ON SCHEMA land_club FROM PUBLIC');
  await client.query('SET search_path TO land_club');
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
  await client.query('ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY');
  const directory=fileURLToPath(new URL('../migrations/',import.meta.url));
  for(const name of (await readdir(directory)).filter(n=>n.endsWith('.sql')).sort()){
   const sql=await readFile(path.join(directory,name),'utf8'),checksum=createHash('sha256').update(sql).digest('hex');
   const existing=await client.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name]);
   if(existing.rows[0]){if(existing.rows[0].checksum!==checksum)throw new Error(`Applied migration changed: ${name}`);continue;}
   await client.query('BEGIN');
   try{await client.query(sql);await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);await client.query('COMMIT');console.log(`Applied ${name}`);}catch(e){await client.query('ROLLBACK');throw e;}
  }
 }finally{await client.query('SELECT pg_advisory_unlock(73190231)');}
}
async function main(){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required for migrations.');
 const client=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000});
 try{await client.connect();await migrate(client);}catch(e){console.error('Migration failed:',e.message);process.exitCode=1;}finally{await client.end();}
}

if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
