import 'server-only';
import {database} from './database';
import {PreparedMemberRepository} from './prepared-members';
export async function preparedMemberStore(){const repo=new PreparedMemberRepository(database());if(!process.env.DATABASE_URL&&process.env.NODE_ENV==='development')await repo.initialize();return repo;}
