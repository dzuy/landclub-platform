'use client';
import {createContext,useCallback,useContext,useEffect,useId,useState,type ReactNode} from 'react';
type SaveStatus=''|'saving'|'unsaved'|'error'|'saved';
const SaveStatusContext=createContext<((id:string,status:SaveStatus)=>void)|null>(null);
export function DetailSaveStatusProvider({children}:{children:ReactNode}){
 const [statuses,setStatuses]=useState<Record<string,SaveStatus>>({});
 const report=useCallback((id:string,status:SaveStatus)=>setStatuses(current=>current[id]===status?current:{...current,[id]:status}),[]);
 const values=Object.values(statuses);
 const text=values.includes('error')?'Changes not saved':values.includes('saving')?'Saving…':values.includes('unsaved')?'':values.includes('saved')?'Changes saved':'';
 return <SaveStatusContext.Provider value={report}><SaveTextContext.Provider value={text}>{children}</SaveTextContext.Provider></SaveStatusContext.Provider>;
}
const SaveTextContext=createContext('');
export function DetailSaveStatus(){const text=useContext(SaveTextContext);return <span className="detail-save-status" role="status" aria-live="polite">{text}</span>;}
export function useDetailSaveStatus(status:SaveStatus){
 const report=useContext(SaveStatusContext),id=useId();
 useEffect(()=>{report?.(id,status);},[report,id,status]);
 useEffect(()=>()=>report?.(id,''),[report,id]);
}
