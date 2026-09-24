import { randomUUID } from 'node:crypto';
import { draftSchema,publicationSchema,readDraft,type PropertyDraft,type PropertyRecord } from './schema';
import { type Database,type Queryable,migration } from './database';
export class ConflictError extends Error{constructor(){super('This property changed in another window. Reload the latest version before saving.');}}
function normalize(p:PropertyRecord):PropertyRecord{return {...p,draft:readDraft(p.draft),published:p.published?readDraft(p.published):null};}
function publicDraft(input:unknown){const {source,...p}=readDraft(input);return p;}
export class PropertyRepository{
 constructor(private db:Database){}
 async locked<T>(work:(repo:PropertyRepository)=>Promise<T>):Promise<T>{return this.db.transaction(async tx=>{
  await tx.query('LOCK TABLE properties IN SHARE ROW EXCLUSIVE MODE');
  return work(new PropertyRepository({...tx,transaction:async fn=>fn(tx)}));
 });}

 async initialize(){for(const statement of migration.split(';').filter(s=>s.trim()))await this.db.query(statement);}
 async list(){return (await this.db.query<PropertyRecord>('SELECT * FROM properties ORDER BY updated_at DESC')).rows.map(normalize);}
 async get(id:string){const p=(await this.db.query<PropertyRecord>('SELECT * FROM properties WHERE id=$1',[id])).rows[0];return p?normalize(p):null;}
 async publicList(){return (await this.db.query<{published:PropertyDraft}>('SELECT published FROM properties WHERE published IS NOT NULL ORDER BY published_at DESC')).rows.map(r=>publicDraft(r.published));}
 async publicBySlug(slug:string){const p=(await this.db.query<{published:PropertyDraft}>("SELECT published FROM properties WHERE published->>'slug'=$1",[slug])).rows[0]?.published;return p?publicDraft(p):null;}
 async history(id:string){return (await this.db.query<{id:string;action:string;actor:string;version:number;created_at:string}>('SELECT id,action,actor,version,created_at FROM property_revisions WHERE property_id=$1 ORDER BY created_at DESC LIMIT 30',[id])).rows;}
 private async audit(tx:Queryable,p:PropertyRecord,action:string,actor:string){await tx.query('INSERT INTO property_revisions(id,property_id,action,actor,version,snapshot) VALUES($1,$2,$3,$4,$5,$6::jsonb)',[randomUUID(),p.id,action,actor,p.version,JSON.stringify(p.draft)]);}
 async create(input:unknown,actor:string){const draft=readDraft(input);return this.db.transaction(async tx=>{const p=(await tx.query<PropertyRecord>('INSERT INTO properties(id,draft) VALUES($1,$2::jsonb) RETURNING *',[randomUUID(),JSON.stringify(draft)])).rows[0];await this.audit(tx,p,'created',actor);return normalize(p);});}
 async save(id:string,version:number,input:unknown,actor:string){const draft=readDraft(input);return this.db.transaction(async tx=>{const p=(await tx.query<PropertyRecord>('UPDATE properties SET draft=$1::jsonb,version=version+1,updated_at=now() WHERE id=$2 AND version=$3 RETURNING *',[JSON.stringify(draft),id,version])).rows[0];if(!p)throw new ConflictError();await this.audit(tx,p,'saved',actor);return normalize(p);});}
 async publish(id:string,version:number,actor:string){return this.db.transaction(async tx=>{const row=(await tx.query<PropertyRecord>('SELECT * FROM properties WHERE id=$1 AND version=$2 FOR UPDATE',[id,version])).rows[0];if(!row)throw new ConflictError();publicationSchema.parse(readDraft(row.draft));const p=(await tx.query<PropertyRecord>('UPDATE properties SET published=draft,published_at=now(),updated_at=now(),version=version+1 WHERE id=$1 RETURNING *',[id])).rows[0];await this.audit(tx,p,'published',actor);return normalize(p);});}
 async unpublish(id:string,version:number,actor:string){return this.db.transaction(async tx=>{const p=(await tx.query<PropertyRecord>('UPDATE properties SET published=NULL,published_at=NULL,version=version+1,updated_at=now() WHERE id=$1 AND version=$2 RETURNING *',[id,version])).rows[0];if(!p)throw new ConflictError();await this.audit(tx,p,'unpublished',actor);return normalize(p);});}
}
