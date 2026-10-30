'use client';
import {useEffect,useId,useState,type ReactNode} from 'react';
import s from './ian-investor-mock.module.css';
export function PortfolioItemSwitcher({items}:{items:{id:string;label:string;content:ReactNode}[]}){
 const controlId=useId();
 const [selected,setSelected]=useState(items[0]?.id??'');
 useEffect(()=>{
  const readSelection=()=>{const id=window.location.hash.replace(/^#position-/,'');if(items.some(item=>item.id===id))setSelected(id);};
  readSelection();window.addEventListener('hashchange',readSelection);
  return ()=>window.removeEventListener('hashchange',readSelection);
 },[items]);
 const active=items.find(item=>item.id===selected)??items[0];
 if(!active)return null;
 return <>
 {items.length>1&&<div className={s.portfolioSelect}><label htmlFor={controlId}>Investment</label><select id={controlId} value={active.id} onChange={event=>{
  const id=event.target.value;setSelected(id);
  window.history.replaceState(window.history.state,'',`#position-${id}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
 }} aria-controls={`${controlId}-panel`}>{items.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></div>}
 <div id={`${controlId}-panel`} role="region" aria-label={active.label} key={active.id}>{active.content}</div>
 </>;
}
