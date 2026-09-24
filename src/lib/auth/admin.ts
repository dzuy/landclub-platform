import 'server-only';
import {createClient} from '@supabase/supabase-js';

export function authAdminClient(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key)throw new Error('Invitation delivery is not configured.');
 return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
}
