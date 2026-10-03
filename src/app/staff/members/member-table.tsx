'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {MemberDrawerLink} from './member-drawer';
import {memberAction,memberDirectoryView,memberStatusLabels,type DirectoryMember,type MemberColumn} from '@/lib/member-directory-view';
import {roleLabels,roleValues} from '@/lib/roles';
import {RoleEditor} from './role-editor';
import {CancelInvitation} from './cancel-invitation';
import styles from './members.module.css';

const columns:{key:MemberColumn;label:string}[]=[{key:'name',label:'Name'},{key:'email',label:'Email'},{key:'roles',label:'Roles'},{key:'status',label:'Status'},{key:'actions',label:'Actions'}];

function MultiFilter({label,options,selected,onChange}:{label:string;options:{id:string;name:string}[];selected:string[];onChange:(values:string[])=>void}){
 const container=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false);const menuId=useId();
 useEffect(()=>{if(!open)return;function outside(event:PointerEvent){if(!container.current?.contains(event.target as Node))setOpen(false);}document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
 return <div ref={container} className={styles.filter} onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}}}>
  <button ref={trigger} type="button" className={styles.filterTrigger} aria-expanded={open} aria-controls={menuId} onClick={()=>setOpen(value=>!value)}>{label}{selected.length>0&&<span className={styles.filterCount}>{selected.length}</span>}<span aria-hidden="true">⌄</span></button>
  {open&&<div id={menuId} className={styles.filterMenu}><fieldset><legend className={styles.srOnly}>Filter by {label.toLowerCase()}</legend>{options.length?options.map(option=><label key={option.id}><input type="checkbox" checked={selected.includes(option.id)} onChange={event=>onChange(event.target.checked?[...selected,option.id]:selected.filter(id=>id!==option.id))}/>{option.name}</label>):<p>No options available.</p>}</fieldset><button type="button" className="secondary" disabled={!selected.length} onClick={()=>onChange([])}>Clear {label.toLowerCase()}</button></div>}
 </div>;
}

export function MemberTable({members,properties}:{members:DirectoryMember[];properties:{id:string;name:string}[]}){
 const [search,setSearch]=useState(''),[selectedProperties,setProperties]=useState<string[]>([]),[selectedRoles,setRoles]=useState<string[]>([]),[selectedStatuses,setStatuses]=useState<string[]>([]);
 const [sort,setSort]=useState<{column:MemberColumn;direction:'asc'|'desc'}>({column:'name',direction:'asc'});
 const visible=memberDirectoryView(members,{search,properties:selectedProperties,roles:selectedRoles,statuses:selectedStatuses},sort);
 const filtered=!!(search||selectedProperties.length||selectedRoles.length||selectedStatuses.length);
 function clear(){setSearch('');setProperties([]);setRoles([]);setStatuses([]);}
 return <section className={styles.directory} aria-label="Member directory">
  <div className={styles.directoryHeading}><span className="eyebrow">MEMBER DIRECTORY</span><span className="muted" role="status">{filtered?`${visible.length} of ${members.length}`:members.length} {members.length===1?'person':'people'}</span></div>
  <div className={styles.directoryTools}>
   <label className={styles.search}><span className={styles.srOnly}>Search members</span><input type="search" placeholder="Search by name or email" value={search} onChange={event=>setSearch(event.target.value)}/></label>
   <MultiFilter label="Properties" options={[...properties].sort((a,b)=>a.name.localeCompare(b.name))} selected={selectedProperties} onChange={setProperties}/>
   <MultiFilter label="Roles" options={roleValues.map(role=>({id:role,name:roleLabels[role]}))} selected={selectedRoles} onChange={setRoles}/>
   <MultiFilter label="Status" options={Object.entries(memberStatusLabels).map(([id,name])=>({id,name}))} selected={selectedStatuses} onChange={setStatuses}/>
   {filtered&&<button type="button" className={`secondary ${styles.clearFilters}`} onClick={clear}>Clear all</button>}
  </div>
  <div className={styles.tableWrap}><table className={styles.table}><thead><tr>{columns.map(column=><th scope="col" key={column.key} aria-sort={sort.column===column.key?(sort.direction==='asc'?'ascending':'descending'):'none'}><button type="button" className={styles.sortButton} onClick={()=>setSort({column:column.key,direction:sort.column===column.key&&sort.direction==='asc'?'desc':'asc'})}>{column.label}<span aria-hidden="true">{sort.column===column.key?(sort.direction==='asc'?'↑':'↓'):'↕'}</span></button></th>)}</tr></thead>
   <tbody>{visible.map(member=><tr key={member.id}><td><MemberDrawerLink id={member.id} name={member.name||member.email}/></td><td>{member.email}</td><td><RoleEditor key={member.roles.join(',')} roles={member.roles} target={member.roleTarget} locked={member.rolesLocked}/></td><td><span className={`badge ${member.status==='active'?'':'sand'}`}>{memberStatusLabels[member.status]}</span></td><td>{memberAction(member)?<CancelInvitation id={member.roleTarget.id} email={member.email}/>:<span className="muted">—</span>}</td></tr>)}{!visible.length&&<tr><td colSpan={columns.length} className={styles.emptyDirectory}>{members.length?'No members match your search and filters.':'No members or invitations yet.'}{filtered&&<button type="button" className="secondary" onClick={clear}>Clear search and filters</button>}</td></tr>}</tbody>
  </table></div>
 </section>;
}
