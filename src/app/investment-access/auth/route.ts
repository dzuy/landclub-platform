import {NextResponse} from 'next/server';
import {authClient} from '@/lib/auth/client';
import {canonicalSiteUrl} from '@/lib/auth/recovery';
export async function GET(request:Request){
 const incoming=new URL(request.url),token=incoming.searchParams.get('token')||'',code=incoming.searchParams.get('code');
 const destination=new URL('/investment-access/accept',canonicalSiteUrl(request.url,process.env.LAND_CLUB_SITE_URL,process.env.NODE_ENV));
 if(/^[A-Za-z0-9_-]{43}$/.test(token))destination.searchParams.set('token',token);
 if(code){try{await (await authClient()).auth.exchangeCodeForSession(code);}catch{/* Acceptance still requires a verified server identity. */}}
 return NextResponse.redirect(destination,{headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
}
