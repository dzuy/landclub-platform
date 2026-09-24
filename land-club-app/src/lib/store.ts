import 'server-only';
import {database} from './database';
import {PropertyRepository} from './repository';
import seeds from './seed-properties.json';
const globalStore=globalThis as unknown as {landClubStore?:Promise<PropertyRepository>};
export function store(){if(!globalStore.landClubStore)globalStore.landClubStore=(async()=>{const repo=new PropertyRepository(database());if(!process.env.DATABASE_URL&&process.env.NODE_ENV==='development')await repo.initialize();if(process.env.NODE_ENV==='development'&&(await repo.list()).length===0){for(const seed of seeds){await repo.create(seed,'demo-seed');}}return repo;})().catch(error=>{globalStore.landClubStore=undefined;throw error;});return globalStore.landClubStore;}
