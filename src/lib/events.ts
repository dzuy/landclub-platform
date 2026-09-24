import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Database} from './database';

export const eventSchema=z.object({
 title:z.string().trim().min(1,'Add an event title.').max(150),
 description:z.string().trim().min(1,'Add an event description.').max(10000),
 startsAt:z.iso.datetime(),endsAt:z.iso.datetime(),
 timeZone:z.string().refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}},'Choose a valid time zone.'),
 location:z.string().trim().min(1,'Add a location or indicate that the event is online.').max(300),
 meetingUrl:z.union([z.literal(''),z.url().refine(value=>new URL(value).protocol==='https:','Use an HTTPS link.')]),
 status:z.enum(['scheduled','cancelled','archived']),
}).refine(value=>Date.parse(value.endsAt)>Date.parse(value.startsAt),{message:'The end must be after the start.',path:['endsAt']});
export type EventDetails=z.infer<typeof eventSchema>;
export type ClubEvent={id:string;details:EventDetails;version:number};
export class EventRepository{
 constructor(private db:Database){}
 async initialize(){await this.db.query(`CREATE TABLE IF NOT EXISTS events (id uuid PRIMARY KEY,details jsonb NOT NULL,version integer NOT NULL DEFAULT 1,created_by text NOT NULL,updated_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`);}
 async list(includeArchived=false){return (await this.db.query<ClubEvent>(`SELECT id,details,version FROM events ${includeArchived?'':"WHERE details->>'status' <> 'archived'"} ORDER BY details->>'startsAt'`)).rows;}
 async save(input:unknown,actor:{id:string;admin:boolean},id?:string,version?:number){
  if(!actor.admin)throw new Error('Only admins can manage events.');
  const details=eventSchema.parse(input);
  if(id){z.uuid().parse(id);z.number().int().positive().parse(version);const row=(await this.db.query<ClubEvent>('UPDATE events SET details=$1::jsonb,version=version+1,updated_by=$2,updated_at=now() WHERE id=$3 AND version=$4 RETURNING id,details,version',[JSON.stringify(details),actor.id,id,version])).rows[0];if(!row)throw new Error('This event changed in another window. Reload before saving.');return row;}
  return (await this.db.query<ClubEvent>('INSERT INTO events(id,details,created_by,updated_by) VALUES($1,$2::jsonb,$3,$3) RETURNING id,details,version',[randomUUID(),JSON.stringify(details),actor.id])).rows[0];
 }
}
