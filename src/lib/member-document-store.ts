import 'server-only';
import {database} from './database';
import {initializeDocumentSecurity} from './document-security-store';
import {MemberDocumentRepository} from './member-documents';
export async function memberDocumentStore(){await initializeDocumentSecurity();return new MemberDocumentRepository(database());}
