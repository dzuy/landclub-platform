import {z} from 'zod';

export const roleValues=['member','prospect','investor','owner','team','lender','admin'] as const;
// Membership is automatic; only these additional roles are assigned by admins.
export const assignableRoleValues=['prospect','investor','owner','team','lender','admin'] as const;
export type ClubRole=(typeof roleValues)[number];
export const roleSchema=z.enum(roleValues);
export const roleLabels:Record<ClubRole,string>={member:'Member',prospect:'Prospect',investor:'Investor',owner:'Owner',team:'Team',lender:'Lender',admin:'Admin'};

export function readRoles(values:unknown[]):ClubRole[]{
 const roles=[...new Set(values.map(value=>roleSchema.safeParse(value)).filter(result=>result.success).map(result=>result.data))];
 return ['member',...roles.filter(role=>role!=='member')];
}
