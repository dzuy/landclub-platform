import {NextResponse,type NextRequest} from 'next/server';
import {authClient} from '@/lib/auth/client';

export async function GET(request:NextRequest){
 const code=request.nextUrl.searchParams.get('code');
 const destination=new URL('/reset-password',request.url);
 if(code){
  try{
   const {error}=await (await authClient()).auth.exchangeCodeForSession(code);
   if(!error)return NextResponse.redirect(destination);
  }catch{/* Fall through to the safe sign-in error state. */}
 }
 const signin=new URL('/signin',request.url);
 signin.searchParams.set('recovery','invalid');
 return NextResponse.redirect(signin);
}
