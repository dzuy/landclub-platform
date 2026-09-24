import type {Client} from 'pg';
export function migrate(client:Client):Promise<void>;
