import 'server-only';
import {investorPlatformDatabase} from './investor-platform-db';
import {InvestorPlatformRepository} from './investor-platform';
export async function investorPlatformStore(){return new InvestorPlatformRepository(await investorPlatformDatabase());}
