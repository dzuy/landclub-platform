import 'server-only';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {database} from './database';
import {store} from './store';
import {PropertyFollowRepository} from './property-follows';
const state=globalThis as unknown as {propertyFollowsReady?:Promise<void>};
export async function propertyFollowStore(){
 if(!process.env.DATABASE_URL&&process.env.NODE_ENV==='development'){
  state.propertyFollowsReady??=(async()=>{await store();for(const sql of (await readFile(path.join(process.cwd(),'migrations/028_property_follows.sql'),'utf8')).split(';').filter(s=>s.trim()))await database().query(sql);})().catch(error=>{state.propertyFollowsReady=undefined;throw error;});
  await state.propertyFollowsReady;
 }
 return new PropertyFollowRepository(database());
}
