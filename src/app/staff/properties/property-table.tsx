'use client';

import {useState} from 'react';
import {PropertyDrawer} from './property-drawer';
import {DataTable,type TableColumn} from '@/components/data-table';
import styles from './property-table.module.css';
import filterStyles from '../members/members.module.css';
import {MultiFilter} from '@/components/table-filter';

export type PropertyRow={id:string;title:string;location:string;thumbnail:string;imageAlt:string;status:string};
type Column='thumbnail'|'title'|'location'|'status'|'edit';
const columns:TableColumn<Column>[]=[
 {key:'thumbnail',label:'Image',width:80,min:80,sortLabel:'Sort by image availability'},
 {key:'title',label:'Title',width:210,min:140},
 {key:'location',label:'Location',width:220,min:140},
 {key:'status',label:'Status',width:175,min:150},
 {key:'edit',label:'Edit',width:70,min:70,sortable:false},
];

export function PropertyTable({rows}:{rows:PropertyRow[]}){
 const [selected,setSelected]=useState<PropertyRow|null>(null);
 const [search,setSearch]=useState('');
 const [locations,setLocations]=useState<string[]>([]),[statuses,setStatuses]=useState<string[]>([]);
 const locationOptions=[...new Set(rows.map(row=>row.location))].sort((a,b)=>a.localeCompare(b)).map(location=>({id:location,name:location}));
 const statusOptions=['Active','Draft'].map(status=>({id:status,name:status}));
 const filtered=!!(search.trim()||locations.length||statuses.length);
 function clear(){setSearch('');setLocations([]);setStatuses([]);}
 const query=search.trim().toLocaleLowerCase();
 const [sort,setSort]=useState<{column:Exclude<Column,'edit'>;ascending:boolean}>({column:'title',ascending:true});
 const [failedImages,setFailedImages]=useState<Set<string>>(()=>new Set());
 function value(row:PropertyRow,column:Exclude<Column,'edit'>){return column==='thumbnail'?(row.thumbnail?'1':'0'):row[column];}
 const sorted=rows.filter(row=>(!query||row.title.toLocaleLowerCase().includes(query)||row.location.toLocaleLowerCase().includes(query))&&(!locations.length||locations.includes(row.location))&&(!statuses.length||statuses.includes(row.status))).sort((a,b)=>{
  const order=value(a,sort.column).localeCompare(value(b,sort.column),undefined,{numeric:true,sensitivity:'base'})||a.title.localeCompare(b.title);
  return sort.ascending?order:-order;
 });
 return <><div className={filterStyles.directoryTools}><label className={filterStyles.search}><span className={filterStyles.srOnly}>Search properties</span><input type="search" placeholder="Search by title or location" value={search} onChange={event=>setSearch(event.target.value)}/></label><MultiFilter label="Location" options={locationOptions} selected={locations} onChange={setLocations}/><MultiFilter label="Status" options={statusOptions} selected={statuses} onChange={setStatuses}/>{filtered&&<button type="button" className={`secondary ${filterStyles.clearFilters}`} onClick={clear}>Clear all</button>}</div><DataTable columns={columns} label="Properties" sort={{column:sort.column,direction:sort.ascending?'asc':'desc'}} onSort={column=>{if(column!=='edit')setSort({column,ascending:sort.column===column?!sort.ascending:true});}}>
  {sorted.map(row=><tr key={row.id} className={styles.clickableRow} onClick={event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    if(event.target instanceof Element&&event.target.closest('a,button,input,select,textarea'))return;
    if(window.getSelection()?.toString())return;
    setSelected(row);
   }}>
   <td>{row.thumbnail&&!failedImages.has(row.id)?<img className={styles.thumbnail} src={row.thumbnail} alt={row.imageAlt||row.title} onError={()=>setFailedImages(current=>new Set(current).add(row.id))}/>:<span className={styles.placeholder} role="img" aria-label="No thumbnail"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/></svg></span>}</td>
   <td><a onClick={event=>{if(!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();setSelected(row);}}} className={styles.title} href={'/staff/properties/'+row.id}>{row.title}</a></td>
   <td>{row.location}</td>
   <td><span className={`badge ${row.status==='Active'?styles.published:row.status==='Draft'?styles.draft:''}`}>{row.status}</span></td>
   <td><a onClick={event=>{if(!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();setSelected(row);}}} className={styles.edit} href={'/staff/properties/'+row.id} aria-label={`Edit ${row.title}`} title={`Edit ${row.title}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6L16 3Z"/><path d="m13 6 5 5"/></svg></a></td>
  </tr>)}{!sorted.length&&<tr><td colSpan={columns.length}>{rows.length?'No properties match your search and filters.':'No properties yet.'}</td></tr>}
 </DataTable>{selected&&<PropertyDrawer key={selected.id} id={selected.id} title={selected.title} onClose={()=>setSelected(null)}/>}</>;
}
