import {PageHeading} from '@/components/page-heading';
import {requireMemberPage} from '@/lib/staff';
import {MemberDocuments} from '@/components/member-documents';
export default async function DocumentsPage(){await requireMemberPage();return <><PageHeading title="Documents"/><MemberDocuments/></>;}
