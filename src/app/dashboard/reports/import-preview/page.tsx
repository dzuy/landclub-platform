import {requireStaffPage} from '@/lib/staff';
import {PageHeading} from '@/components/page-heading';
import {ImportPreview} from './preview';
export default async function ImportPreviewPage(){await requireStaffPage();return <><PageHeading title="Investor import preview" description="Validate normalized source records. This preview does not save data or grant access."/><ImportPreview/></>;}
