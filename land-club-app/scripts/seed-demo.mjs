import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export async function seedDemo(client){
 const seeds=JSON.parse(await readFile(new URL('../src/lib/seed-properties.json',import.meta.url),'utf8'));
 await client.query('BEGIN');
 try{
  await client.query('SELECT pg_advisory_xact_lock(73190232)');
  await client.query('SET LOCAL search_path TO land_club');
  for(const source of seeds){
   const draft={...source,isDemo:true};
   const exists=await client.query("SELECT id FROM properties WHERE draft->>'slug'=$1 OR published->>'slug'=$1",[draft.slug]);
   if(exists.rows.length)continue;
   const id=randomUUID(),snapshot=JSON.stringify(draft);
   await client.query('INSERT INTO properties(id,draft,published,version,published_at) VALUES($1,$2::jsonb,$2::jsonb,1,now())',[id,snapshot]);
   await client.query("INSERT INTO property_revisions(id,property_id,action,actor,version,snapshot) VALUES($1,$2,'published','demo-seed',1,$3::jsonb)",[randomUUID(),id,snapshot]);
   console.log(`Imported demo property: ${draft.name}`);
  }
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}
}
async function main(){
 if(process.env.SEED_DEMO_CONTENT!=='true'){console.log('Demo import disabled.');}
 else{
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required.');
  const client=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000});
  try{await client.connect();await seedDemo(client);}catch(e){console.error('Demo import failed:',e.message);process.exitCode=1;}finally{await client.end();}
 }
}

if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
