import 'server-only';
import {database} from './database';
import {EventRepository} from './events';
export async function eventStore(){const repo=new EventRepository(database());if(!process.env.DATABASE_URL&&process.env.NODE_ENV==='development')await repo.initialize();return repo;}
