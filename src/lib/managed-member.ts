import 'server-only';
import {currentUser} from './auth/identity';
import {authAdminClient} from './auth/admin';
// Callers must requireStaff before using this account lookup.
export async function managedMember(id:string){
 if(!process.env.SUPABASE_SECRET_KEY){const user=await currentUser();if(user?.id===id)return user;throw new Error('Auth administration is not configured.');}
 const {data,error}=await authAdminClient().auth.admin.getUserById(id);if(error||!data.user)throw new Error('Member unavailable.');return data.user;
}
