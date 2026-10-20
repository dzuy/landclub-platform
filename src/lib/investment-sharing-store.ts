import 'server-only';
import {currentUser} from './auth/identity';
import {clubIdentity} from './staff';
import {investorPlatformDatabase} from './investor-platform-db';
import {InvestmentSharingRepository,type SharingActor} from './investment-sharing';
import {InvestorReportRepository} from './investor-reports';
export async function sharingActor():Promise<SharingActor|null>{
 const user=await currentUser();
 if(!user?.email||!user.email_confirmed_at||user.is_anonymous||(await clubIdentity())?.preview)return null;
 return {id:user.id,email:user.email,verified:true};
}
export async function sharingStore(){return new InvestmentSharingRepository(await investorPlatformDatabase());}
export async function sharedReports(){return new InvestorReportRepository(await investorPlatformDatabase(),{person:false,draft:false,shared:true});}
