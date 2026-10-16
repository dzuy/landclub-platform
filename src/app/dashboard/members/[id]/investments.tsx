'use client';
import {useEffect,useState,useTransition} from 'react';
import {investmentName,type Investment,type InvestmentSelection} from '@/lib/member-investments';
import {saveMemberInvestments} from './investment-actions';
import {useDetailSaveStatus} from '@/components/detail-save-status';
import styles from '../members.module.css';
export function MemberInvestments({userId,initial,properties,onSaveBeforeClose}:{onSaveBeforeClose?:(save:(()=>Promise<boolean>)|null)=>void;userId:string;initial:InvestmentSelection;properties:{id:string;name:string}[]}){
 const [saved,setSaved]=useState(initial),[selected,setSelected]=useState(initial.entities),[error,setError]=useState(''),[pending,start]=useTransition();
 const dirty=JSON.stringify(selected)!==JSON.stringify(saved.entities);
 useEffect(()=>{onSaveBeforeClose?.(async()=>{if(dirty||pending){setError('Save or cancel your investment changes before closing.');return false;}return true;});return()=>onSaveBeforeClose?.(null);},[dirty,pending,onSaveBeforeClose]);
 useEffect(()=>{const guard=(event:BeforeUnloadEvent)=>{if(dirty||pending){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty,pending]);
 useDetailSaveStatus(error?'error':pending?'saving':dirty?'unsaved':saved!==initial?'saved':'');
 function toggle(entity:Investment){setSelected(current=>current.some(item=>item.kind===entity.kind&&item.id===entity.id)?current.filter(item=>!(item.kind===entity.kind&&item.id===entity.id)):[...current,entity]);}
 const groups:{label:string;entities:Investment[]}[]=[{label:'Company',entities:[{kind:'company',id:'land-club-llc'}]},{label:'Properties',entities:properties.map(p=>({kind:'property',id:p.id}))}];
 return <div className={styles.investments}>
 <div className={styles.investmentMenu}>
 {groups.map(group=><fieldset key={group.label} disabled={pending}><legend>{group.label}</legend><div className={group.label==='Properties'?styles.investmentPropertyGrid:undefined}>{group.entities.map(entity=><label className={styles.investmentOption} key={entity.id}><input type="checkbox" checked={selected.some(item=>item.kind===entity.kind&&item.id===entity.id)} onChange={()=>toggle(entity)}/><span>{investmentName(entity,properties)}</span></label>)}</div></fieldset>)}
 </div>
 {dirty&&<div className="row-actions"><button disabled={pending} onClick={()=>{setError('');start(async()=>{try{const result=await saveMemberInvestments(userId,selected,saved.version);if(result.selection){setSaved(result.selection);setSelected(result.selection.entities);}else setError(result.error||'Unable to save investments.');}catch{setError('Unable to save investments. Please try again.');}});}}>{pending?'Saving…':'Save investments'}</button><button type="button" className="secondary" disabled={pending} onClick={()=>{setSelected(saved.entities);setError('');}}>Cancel</button></div>}
 {error&&<p role="alert" className="cms-error">{error}</p>}
 </div>;
}
