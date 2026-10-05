import {PageHeading} from '@/components/page-heading';
import {requireStaffPage} from '@/lib/staff';
import {store} from '@/lib/store';
import {CreateProperty,SyncNotionProperties} from '@/components/create-property';
import {PropertyTable} from './property-table';
export default async function Properties(){await requireStaffPage();const rows=await (await store()).list();return <><PageHeading title="Properties"><div className="property-library-actions"><SyncNotionProperties/><CreateProperty/></div></PageHeading><div className="property-library-header"><div className="cms-stats"><span><strong>{rows.length}</strong> properties</span><span><strong>{rows.filter(r=>r.published).length}</strong> active</span><span><strong>{rows.filter(r=>!r.published).length}</strong> drafts</span></div></div><PropertyTable rows={rows.map(p=>({id:p.id,title:p.draft.name||'Untitled property',location:p.draft.region||'Location to be confirmed',thumbnail:p.draft.hero,imageAlt:p.draft.imageAlt,status:p.published?'Active':'Draft'}))}/></>}
