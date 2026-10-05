'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import styles from './data-table.module.css';

export type TableColumn<K extends string>={key:K;label:string;width:number;min:number;sortable?:boolean;sortLabel?:string};
export function DataTable<K extends string>({columns,sort,onSort,label,children,widthStorageKey}:{columns:TableColumn<K>[];sort:{column:K;direction:'asc'|'desc'};onSort:(column:K)=>void;label:string;children:ReactNode;widthStorageKey?:string}){
 const [widths,setWidths]=useState(columns.map(c=>c.width));
 const currentWidths=useRef(widths);
 useEffect(()=>{
  if(!widthStorageKey)return;
  try{
   const saved:unknown=JSON.parse(localStorage.getItem(widthStorageKey)||'null');
   if(!saved||typeof saved!=='object'||Array.isArray(saved))return;
   const restored=columns.map(column=>{const value=(saved as Record<string,unknown>)[column.key];return typeof value==='number'&&Number.isFinite(value)?Math.min(800,Math.max(column.min,value)):column.width;});
   currentWidths.current=restored;setWidths(restored);
  }catch{/* Keep default widths if storage is unavailable or invalid. */}
 },[columns,widthStorageKey]);
 const resize=useRef<{index:number;x:number;width:number}|null>(null);
 function changeWidth(index:number,width:number){
  const next=currentWidths.current.map((v,i)=>i===index?Math.min(800,Math.max(columns[index].min,width)):v);
  currentWidths.current=next;setWidths(next);
  if(widthStorageKey)try{localStorage.setItem(widthStorageKey,JSON.stringify(Object.fromEntries(columns.map((column,i)=>[column.key,next[i]]))));}catch{/* Resizing still works when local storage is unavailable. */}
 }
 return <div className={styles.wrap}><table className={styles.table} style={{width:widths.reduce((sum,w)=>sum+w,0)}} aria-label={label}>
  <colgroup>{columns.map((column,index)=><col key={column.key} style={{width:widths[index]}}/>)}</colgroup>
  <thead><tr>{columns.map((column,index)=><th key={column.key} scope="col" aria-sort={column.sortable===false?undefined:sort.column===column.key?(sort.direction==='asc'?'ascending':'descending'):'none'}>
   {column.sortable===false?<span className={styles.headerLabel}>{column.label}</span>:<button type="button" className={styles.sort} title={column.sortLabel||`Sort by ${column.label.toLowerCase()}`} onClick={()=>onSort(column.key)}>{column.label}<span aria-hidden="true">{sort.column===column.key?(sort.direction==='asc'?'↑':'↓'):'↕'}</span></button>}
   <span className={styles.resize} role="separator" tabIndex={0} aria-label={`Resize ${column.label} column`} aria-orientation="vertical" aria-valuemin={column.min} aria-valuemax={800} aria-valuenow={widths[index]}
    onPointerDown={event=>{event.preventDefault();resize.current={index,x:event.clientX,width:widths[index]};event.currentTarget.setPointerCapture(event.pointerId);}}
    onPointerMove={event=>{const active=resize.current;if(active?.index===index)changeWidth(index,active.width+event.clientX-active.x);}}
    onPointerUp={()=>{resize.current=null;}} onPointerCancel={()=>{resize.current=null;}} onLostPointerCapture={()=>{resize.current=null;}}
    onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();changeWidth(index,widths[index]+(event.key==='ArrowRight'?10:-10));}}}/>
  </th>)}</tr></thead>
  <tbody>{children}</tbody>
 </table></div>;
}
