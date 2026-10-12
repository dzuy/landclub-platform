'use client';
import {useState} from 'react';
import {MultiFilter} from '@/components/table-filter';
import {MemberDrawerLink} from './member-drawer';
import {memberDirectoryView,memberStatusLabels,type DirectoryMember,type MemberColumn} from '@/lib/member-directory-view';
import {roleLabels,roleValues} from '@/lib/roles';
import {RoleEditor} from './role-editor';
import {DataTable,type TableColumn} from '@/components/data-table';
import styles from './members.module.css';

const columns:TableColumn<MemberColumn>[]=[{key:'name',label:'Name',width:180,min:140},{key:'email',label:'Email',width:210,min:150},{key:'roles',label:'Roles',width:180,min:150},{key:'status',label:'Status',width:100,min:90}];


export function MemberTable({members,properties}:{members:DirectoryMember[];properties:{id:string;name:string}[]}){
 const [search,setSearch]=useState(''),[selectedProperties,setProperties]=useState<string[]>([]),[selectedRoles,setRoles]=useState<string[]>([]),[selectedStatuses,setStatuses]=useState<string[]>([]);
 const [sort,setSort]=useState<{column:MemberColumn;direction:'asc'|'desc'}>({column:'name',direction:'asc'});
 const visible=memberDirectoryView(members,{search,properties:selectedProperties,roles:selectedRoles,statuses:selectedStatuses},sort);
 const filtered=!!(search||selectedProperties.length||selectedRoles.length||selectedStatuses.length);
 function clear(){setSearch('');setProperties([]);setRoles([]);setStatuses([]);}
 return <section className={styles.directory} aria-label="Member directory">
  <div className={styles.directoryHeading}><span className="muted" role="status">{filtered?`${visible.length} of ${members.length}`:members.length} {members.length===1?'person':'people'}</span></div>
  <div className={styles.directoryTools}>
   <label className={styles.search}><span className={styles.srOnly}>Search members</span><input type="search" placeholder="Search by name or email" value={search} onChange={event=>setSearch(event.target.value)}/></label>
   <MultiFilter label="Properties" options={[...properties].sort((a,b)=>a.name.localeCompare(b.name))} selected={selectedProperties} onChange={setProperties}/>
   <MultiFilter label="Roles" options={roleValues.map(role=>({id:role,name:roleLabels[role]}))} selected={selectedRoles} onChange={setRoles}/>
   <MultiFilter label="Status" options={Object.entries(memberStatusLabels).map(([id,name])=>({id,name}))} selected={selectedStatuses} onChange={setStatuses}/>
   {filtered&&<button type="button" className={`secondary ${styles.clearFilters}`} onClick={clear}>Clear all</button>}
  </div>
  <DataTable columns={columns} label="Members" widthStorageKey="land-club:members:column-widths" sort={sort} onSort={column=>setSort({column,direction:sort.column===column&&sort.direction==='asc'?'desc':'asc'})}>
   {visible.map(member=><tr key={member.id} className={styles.clickableRow} onClick={event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    if(event.target instanceof Element&&event.target.closest('a,button,input,select,textarea,label,form,dialog'))return;
    if(window.getSelection()?.toString())return;
    event.currentTarget.querySelector<HTMLButtonElement>('[data-member-drawer-trigger]')?.click();
   }}><td><MemberDrawerLink id={member.id} name={member.name||member.email}/></td><td>{member.email}</td><td><RoleEditor key={member.roles.join(',')} roles={member.roles} target={member.roleTarget} locked={member.rolesLocked}/></td><td><span className={`badge ${member.status==='active'?'':'sand'}`}>{memberStatusLabels[member.status]}</span></td></tr>)}{!visible.length&&<tr><td colSpan={columns.length} className={styles.emptyDirectory}>{members.length?'No members match your search and filters.':'No members or invitations yet.'}{filtered&&<button type="button" className="secondary" onClick={clear}>Clear search and filters</button>}</td></tr>}
  </DataTable>
 </section>;
}
