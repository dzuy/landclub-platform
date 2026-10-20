import 'server-only';
import {headers} from 'next/headers';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {sourceWorkbooksSchema,sourceReviewReports,localSourceReviewAllowed} from './investor-source-review';
export {localSourceReviewAllowed} from './investor-source-review';
export async function loadLocalSourceReview(actor:{admin:boolean;local?:boolean}|null){
 if(!localSourceReviewAllowed(actor,process.env.NODE_ENV,(await headers()).get('host')||''))throw new Error('Local administrator required.');
 const books=sourceWorkbooksSchema.parse(JSON.parse(await readFile(path.join(process.cwd(),'.data/investor-review/workbooks.json'),'utf8')));
 return {books,reports:sourceReviewReports(books)};
}

/** Current imported source evidence, available to authorized admins without local files. */
export async function loadInvestorSourceReview(actor:{admin:boolean;local?:boolean}|null){
 if(!actor?.admin)throw new Error('Administrator required.');
 if(!process.env.DATABASE_URL)return loadLocalSourceReview(actor);
 const {investorPlatformDatabase}=await import('./investor-platform-db');
 const db=await investorPlatformDatabase();
 const row=(await db.query<{payload:unknown}>("SELECT payload FROM investor_source_snapshots WHERE source_key='nathan-2026-10-16' ORDER BY captured_at DESC,id DESC LIMIT 1")).rows[0];
 if(!row)throw new Error('No imported investor source is available.');
 const books=sourceWorkbooksSchema.parse(row.payload);
 return {books,reports:sourceReviewReports(books)};
}
