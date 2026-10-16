import 'server-only';
import {database} from './database';
import {initializeDocumentSecurity} from './document-security-store';
import {GroupDocumentRepository} from './group-documents';
export async function groupDocumentStore(){await initializeDocumentSecurity();return new GroupDocumentRepository(database());}
