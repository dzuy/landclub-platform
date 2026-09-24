export function isStaffUser(user:{id:string;email_confirmed_at?:string|null;is_anonymous?:boolean}|null,allowlist:string|undefined){
 return !!user&&!user.is_anonymous&&!!user.email_confirmed_at&&(allowlist||'').split(',').map(id=>id.trim()).filter(Boolean).includes(user.id);
}
export function authConfigured(){return !!process.env.SUPABASE_URL&&!!process.env.SUPABASE_PUBLISHABLE_KEY;}
