import { PGlite } from '@electric-sql/pglite';
import { Pool, type PoolClient } from 'pg';
import path from 'node:path';
import {mkdirSync} from 'node:fs';
export interface Queryable{query<T>(sql:string,params?:unknown[]):Promise<{rows:T[]}>}
export interface Database extends Queryable{transaction<T>(work:(tx:Queryable)=>Promise<T>):Promise<T>}
export function embeddedDatabase(db:PGlite):Database{return {query:(sql,params)=>db.query(sql,params),transaction:work=>db.transaction(tx=>work({query:(sql,params)=>tx.query(sql,params)}))};}
const globalDb=globalThis as unknown as {landClubDb?:Database};
export function database():Database{
 if(globalDb.landClubDb)return globalDb.landClubDb;
 if(process.env.DATABASE_URL){const pool=new Pool({connectionString:process.env.DATABASE_URL,max:5});const adapter=(client:Pool|PoolClient):Queryable=>({query:async<T>(sql:string,params?:unknown[])=>({rows:(await client.query(sql,params)).rows as T[]})});globalDb.landClubDb={...adapter(pool),transaction:async work=>{const c=await pool.connect();try{await c.query('BEGIN');const result=await work(adapter(c));await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}};}
 else{if(process.env.NODE_ENV==='production')throw new Error('DATABASE_URL is required in production.');mkdirSync(path.join(process.cwd(),'.data'),{recursive:true});globalDb.landClubDb=embeddedDatabase(new PGlite(path.join(process.cwd(),'.data','land-club')));}
 return globalDb.landClubDb;
}
export const migration=`
CREATE TABLE IF NOT EXISTS properties (
 id uuid PRIMARY KEY, draft jsonb NOT NULL, published jsonb,
 version integer NOT NULL DEFAULT 1, published_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS properties_draft_slug ON properties ((draft->>'slug'));
CREATE UNIQUE INDEX IF NOT EXISTS properties_published_slug ON properties ((published->>'slug')) WHERE published IS NOT NULL;
CREATE TABLE IF NOT EXISTS property_revisions (
 id uuid PRIMARY KEY, property_id uuid NOT NULL REFERENCES properties(id),
 action text NOT NULL CHECK(action IN ('created','saved','published','unpublished')),
 actor text NOT NULL, version integer NOT NULL, snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
`;
