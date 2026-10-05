import {requireStaffPage} from '@/lib/staff';
import {store} from '@/lib/store';
import {groupDocumentStore} from '@/lib/group-document-store';
import {GroupDocumentManager} from './manager';
export default async function DocumentsAdminPage(){
 const actor=await requireStaffPage();
 const properties=(await (await store()).list()).map(p=>({id:p.id,name:p.draft.name||'Untitled property'}));
 const documents=await (await groupDocumentStore()).listAdmin(actor);
 return <><header className="admin-page-heading"><h1>Documents</h1></header><GroupDocumentManager initial={JSON.parse(JSON.stringify(documents))} properties={properties}/></>;
}
