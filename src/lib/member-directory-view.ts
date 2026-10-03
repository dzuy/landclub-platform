import type {MemberDirectoryRow} from './members';
import {roleLabels} from './roles';

export type DirectoryMember=MemberDirectoryRow & {propertyIds:string[]};
export const memberStatusLabels={active:'Active',invited:'Invited',draft:'Draft',sending:'Sending'};
export type MemberColumn='name'|'email'|'roles'|'status'|'lastActiveAt'|'joinedAt'|'actions';
export type DirectoryFilters={search:string;properties:string[];roles:string[];statuses:string[]};
export function memberAction(member:MemberDirectoryRow){return member.status==='invited'&&member.roleTarget.kind==='invitation'?'Cancel invitation':'';}
export function memberDirectoryView(members:DirectoryMember[],filters:DirectoryFilters,sort:{column:MemberColumn;direction:'asc'|'desc'}){
 const terms=filters.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const filtered=members.filter(member=>{
  const text=`${member.name||''} ${member.email}`.toLocaleLowerCase();
  return terms.every(term=>text.includes(term))
   &&(!filters.properties.length||member.propertyIds.some(id=>filters.properties.includes(id)))
   &&(!filters.roles.length||member.roles.some(role=>filters.roles.includes(role)))
   &&(!filters.statuses.length||filters.statuses.includes(member.status));
 });
 const value=(member:DirectoryMember)=>{
  switch(sort.column){
   case 'name':return member.name||member.email;
   case 'roles':return member.roles.map(role=>roleLabels[role]).sort().join(', ');
   case 'status':return memberStatusLabels[member.status];
   case 'actions':return memberAction(member);
   case 'email':return member.email;
   case 'joinedAt':return Date.parse(member.joinedAt);
   case 'lastActiveAt':return member.lastActiveAt?Date.parse(member.lastActiveAt):null;
  }
 };
 return filtered.sort((a,b)=>{
  const av=value(a),bv=value(b);
  // Keep members who have never signed in below dated activity in either direction.
  if(av===null||bv===null)return av===bv?0:av===null?1:-1;
  const compared=typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv),undefined,{sensitivity:'base',numeric:true});
  return (sort.direction==='asc'?compared:-compared)||a.id.localeCompare(b.id);
 });
}
