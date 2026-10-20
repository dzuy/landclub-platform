import 'server-only';
import type {SharingMail} from './investment-sharing';
import {sendSharingEmail} from './sharing-email';
export async function deliverSharingInvitation(mail:SharingMail){await sendSharingEmail(mail,process.env);}
