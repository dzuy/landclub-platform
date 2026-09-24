import {NextResponse,type NextRequest} from 'next/server';
import {authClient} from '@/lib/auth/client';
import {canonicalSiteUrl} from '@/lib/auth/recovery';
import {database} from '@/lib/database';
import {InvitationRepository} from '@/lib/invitations';

export async function GET(request:NextRequest){
 const siteUrl=canonicalSiteUrl(request.url,process.env.LAND_CLUB_SITE_URL,process.env.NODE_ENV);
 const tokenHash=request.nextUrl.searchParams.get('token_hash'),type=request.nextUrl.searchParams.get('type');
 if(tokenHash&&type==='invite')try{
  const client=await authClient();const {data,error}=await client.auth.verifyOtp({token_hash:tokenHash,type:'invite'});
  if(!error&&data.user?.email){const repository=new InvitationRepository(database());await repository.initialize();if(await repository.pendingForUser(data.user.id,data.user.email))return NextResponse.redirect(new URL('/accept-invite',siteUrl));}
  await client.auth.signOut({scope:'local'});
 }catch{/* Use the generic invalid-invitation state below. */}
 const signin=new URL('/signin',siteUrl);signin.searchParams.set('invitation','invalid');return NextResponse.redirect(signin);
}
