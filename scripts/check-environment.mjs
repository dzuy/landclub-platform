export function validateEnvironment(env){
 const required=['DATABASE_URL','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','STAFF_USER_IDS','LAND_CLUB_SITE_URL'];
 const missing=required.filter(key=>!env[key]?.trim());
 if(missing.length)throw new Error(`Missing required variables: ${missing.join(', ')}`);
 if(!/^postgres(ql)?:$/.test(new URL(env.DATABASE_URL).protocol))throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
 if(new URL(env.SUPABASE_URL).protocol!=='https:')throw new Error('SUPABASE_URL must use HTTPS.');
 if(new URL(env.LAND_CLUB_SITE_URL).protocol!=='https:')throw new Error('LAND_CLUB_SITE_URL must use HTTPS.');
 if(env.LAND_CLUB_LOCAL_STAFF==='1')throw new Error('Remove LAND_CLUB_LOCAL_STAFF from hosted environments.');
 if(!env.STAFF_USER_IDS.split(',').every(id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim())))throw new Error('STAFF_USER_IDS must contain comma-separated Supabase user UUIDs.');
}
import {fileURLToPath} from 'node:url';
if(process.argv[1]===fileURLToPath(import.meta.url)){try{validateEnvironment(process.env);console.log('Deployment variables validated.');}catch(e){console.error(e.message);process.exitCode=1;}}
