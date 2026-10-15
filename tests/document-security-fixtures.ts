import {readFile} from 'node:fs/promises';
import type {PGlite} from '@electric-sql/pglite';
import type {Database} from '../src/lib/database';
import {scanQuarantinedDocument} from '../src/lib/document-scanner';
export async function securitySchema(pg:PGlite){for(const file of ['012_member_documents.sql','013_group_documents.sql','017_document_security.sql'])await pg.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));}
// Synthetic test fixture verdict only; production has no approval/bypass endpoint.
export async function cleanFixture(db:Database,kind:'member_documents'|'group_documents',id:string){return scanQuarantinedDocument(db,kind,id,async()=> 'clean');}
