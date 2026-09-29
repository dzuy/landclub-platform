import 'server-only';
import {database} from './database';
import {store} from './store';
import {MemberPropertyRepository} from './member-properties';
export async function memberPropertyStore(){const repo=new MemberPropertyRepository(database());if(!process.env.DATABASE_URL&&process.env.NODE_ENV==='development'){await store();await repo.initialize();}return repo;}
