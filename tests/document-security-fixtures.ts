import {readFile} from 'node:fs/promises';
import type {PGlite} from '@electric-sql/pglite';
export async function securitySchema(pg:PGlite){for(const file of ['012_member_documents.sql','013_group_documents.sql','017_document_audit.sql'])await pg.exec(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8'));}
