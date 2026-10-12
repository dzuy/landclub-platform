import {z} from 'zod';

export const INVITATION_MESSAGE_MAX_LENGTH=2000;
export const invitationMessageSchema=z.string().max(INVITATION_MESSAGE_MAX_LENGTH,'Keep the invitation message to 2,000 characters or fewer.').transform(value=>value.replace(/\r\n?/g,'\n').trim());

// The email template renders each line as escaped text, with explicit line breaks.
export function invitationMessageData(message:string){
 return {land_club_invitation_message_lines:message?message.split('\n'):[]};
}
