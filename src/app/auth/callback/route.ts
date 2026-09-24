import {NextResponse,type NextRequest} from 'next/server';
import {authClient} from '@/lib/auth/client';
import {canonicalSiteUrl} from '@/lib/auth/recovery';

export async function GET(request:NextRequest){
 const code=request.nextUrl.searchParams.get('code');
 const siteUrl=canonicalSiteUrl(request.url,process.env.LAND_CLUB_SITE_URL,process.env.NODE_ENV);
 const destination=new URL('/reset-password',siteUrl);
 if(code){
  try{
   const {error}=await (await authClient()).auth.exchangeCodeForSession(code);
   if(!error)return NextResponse.redirect(destination);
  }catch{/* Fall through to the safe sign-in error state. */}
 }
 const signin=new URL('/signin',siteUrl);
 signin.searchParams.set('recovery','invalid');
 return NextResponse.redirect(signin);
}
