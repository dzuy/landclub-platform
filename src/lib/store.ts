import 'server-only';
import {database} from './database';
import {PropertyRepository} from './repository';
import seeds from './seed-properties.json';
const globalStore=globalThis as unknown as {landClubSchemaV2Ready?:Promise<void>};
export async function store(){
 // Cache initialization, not class instances: hot reload must pick up the current validator.
 const repo=new PropertyRepository(database());
 if(!globalStore.landClubSchemaV2Ready)globalStore.landClubSchemaV2Ready=(async()=>{
  if(!process.env.DATABASE_URL&&process.env.NODE_ENV==='development')await repo.initialize();
  if(process.env.NODE_ENV==='development'&&(await repo.list()).length===0){for(const seed of seeds)await repo.create(seed,'demo-seed');}
 })().catch(error=>{globalStore.landClubSchemaV2Ready=undefined;throw error;});
 await globalStore.landClubSchemaV2Ready;
 return repo;
}
