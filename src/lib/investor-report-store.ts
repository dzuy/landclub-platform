import 'server-only';
import {investorPlatformDatabase} from './investor-platform-db';
import {InvestorReportRepository} from './investor-reports';
import {clubIdentity} from './staff';
export async function investorReportStore(){
 const actor=await clubIdentity();
 return new InvestorReportRepository(await investorPlatformDatabase(),actor?.preview&&!actor.preview.expired?{person:true,draft:actor.preview.mode==='draft',subjectId:actor.preview.personId}:{person:false,draft:false});
}
