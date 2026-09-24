import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
export async function proxy(request:NextRequest){
 let response=NextResponse.next({request});
 response.headers.set('Cache-Control','private, no-store');
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return response;
 const client=createServerClient(url,key,{cookieOptions:{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/'},cookies:{getAll:()=>request.cookies.getAll(),setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));response.headers.set('Cache-Control','private, no-store');}}});
 try{await client.auth.getUser();}catch{/* Staff authorization independently fails closed. */}
 return response;
}
export const config={matcher:['/staff/:path*','/signin']};
