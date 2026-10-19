import 'server-only';
import {database} from './database';
import {MemberInvestmentRepository} from './member-investments';
export async function memberInvestmentStore(){const repo=new MemberInvestmentRepository(database());if(!process.env.DATABASE_URL&&process.env.NODE_ENV==='development')await repo.initialize();return repo;}
