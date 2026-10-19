import {z} from 'zod';
import type {Database} from './database';

// Entity kinds can grow independently of club roles and property access.
export const investmentSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('company'),id:z.literal('land-club-llc')}),
 z.object({kind:z.literal('property'),id:z.uuid()}),
]);
export type Investment=z.infer<typeof investmentSchema>;
export type InvestmentSelection={entities:Investment[];version:number};
export const investmentSelectionSchema=z.array(investmentSchema).max(100).transform(items=>items.filter((item,index)=>items.findIndex(other=>other.kind===item.kind&&other.id===item.id)===index));
export const investmentsMigration=`CREATE TABLE IF NOT EXISTS member_investments (
 user_id uuid PRIMARY KEY, entities jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(entities)='array'),
 version integer NOT NULL DEFAULT 1, updated_by text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
); ALTER TABLE member_investments ENABLE ROW LEVEL SECURITY;`;
export class MemberInvestmentRepository{
 constructor(private db:Database){}
 async initialize(){for(const statement of investmentsMigration.split(';').filter(s=>s.trim()))await this.db.query(statement);}
 async get(userId:string):Promise<InvestmentSelection>{z.uuid().parse(userId);return (await this.db.query<InvestmentSelection>('SELECT entities,version FROM member_investments WHERE user_id=$1',[userId])).rows[0]??{entities:[],version:0};}
 async save(userId:string,input:unknown,version:number,actor:{id:string;admin:boolean}){
  if(!actor.admin)throw new Error('Admin access required.');
  z.uuid().parse(userId);z.number().int().nonnegative().parse(version);const entities=investmentSelectionSchema.parse(input);
  return this.db.transaction(async tx=>{
   const ids=entities.filter(e=>e.kind==='property').map(e=>e.id);
   if(ids.length&&(await tx.query('SELECT id FROM properties WHERE id=ANY($1::uuid[])',[ids])).rows.length!==ids.length)throw new Error('A selected property is no longer available. Refresh and try again.');
   const result=version===0?await tx.query<InvestmentSelection>('INSERT INTO member_investments(user_id,entities,updated_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING entities,version',[userId,JSON.stringify(entities),actor.id]):await tx.query<InvestmentSelection>('UPDATE member_investments SET entities=$2,version=version+1,updated_by=$3,updated_at=now() WHERE user_id=$1 AND version=$4 RETURNING entities,version',[userId,JSON.stringify(entities),actor.id,version]);
   if(!result.rows.length)throw new Error('Investments changed. Refresh before trying again.');
   return result.rows[0];
  });
 }
}
export function investmentName(entity:Investment,properties:{id:string;name:string}[]){return entity.kind==='company'?'Land Club LLC':properties.find(p=>p.id===entity.id)?.name??'Unavailable property';}
