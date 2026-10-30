'use client';

import {useEffect,useId,useMemo,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {DndContext,DragOverlay,KeyboardSensor,PointerSensor,closestCenter,defaultDropAnimationSideEffects,useSensor,useSensors,type DragEndEvent} from '@dnd-kit/core';
import {SortableContext,arrayMove,rectSortingStrategy,sortableKeyboardCoordinates,useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import type {MemberPropertyDetail} from '@/lib/member-property-presentation';
import {propertyCardOrder} from '@/lib/property-card-order';
import {useSharedPropertyCardOrder} from './property-card-order-provider';
import {MemberPropertyCard} from './member-property-card';
import styles from './member-property-card.module.css';

const easing='cubic-bezier(0.22, 1, 0.36, 1)';
function Grip(){return <svg width="18" height="22" viewBox="0 0 18 22" fill="currentColor" aria-hidden="true">{[5,11,17].flatMap(y=>[6,12].map(x=><circle key={`${x}-${y}`} cx={x} cy={y} r="1.5"/>))}</svg>;}

function SortableCard({detail,disabled,reducedMotion,actions}:{detail:MemberPropertyDetail;disabled:boolean;reducedMotion:boolean;actions?:ReactNode}){
 const {attributes,listeners,setNodeRef,setActivatorNodeRef,transform,transition,isDragging}=useSortable({id:detail.id,disabled,transition:reducedMotion?null:{duration:300,easing}});
 return <div ref={setNodeRef} className={`${styles.sortable} ${isDragging?styles.dragging:''}`} style={{transform:CSS.Transform.toString(transform),transition}}>
  <MemberPropertyCard detail={detail} actions={actions} handle={<button ref={setActivatorNodeRef} type="button" className={styles.handle} {...attributes} {...listeners} disabled={disabled} aria-label={`Reorder ${detail.property.name||'property'}`} title="Drag to reorder, or press Space and use the arrow keys"><Grip/></button>}/>
 </div>;
}

export function SortablePropertyGrid({properties,children,renderActions,disabled=false}:{properties:MemberPropertyDetail[];children?:ReactNode;renderActions?:(detail:MemberPropertyDetail)=>ReactNode;disabled?:boolean}){
 const contextId=useId();
 const [ready,setReady]=useState(false),[activeId,setActiveId]=useState<string|null>(null),[reducedMotion,setReducedMotion]=useState(false);
 const preference=useSharedPropertyCardOrder();
 const {setDragging}=preference;
 useEffect(()=>()=>setDragging(false),[setDragging]);
 const ids=useMemo(()=>propertyCardOrder(properties.map(p=>p.id),preference.order),[properties,preference.order]);
 const byId=new Map(properties.map(p=>[p.id,p]));
 const active=activeId?byId.get(activeId):undefined;
 const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:6}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
 useEffect(()=>setReady(true),[]);
 useEffect(()=>{
  const query=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReducedMotion(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);
 },[]);
 function finish({active,over}:DragEndEvent){
  setActiveId(null);setDragging(false);
  if(!over||active.id===over.id)return;
  const from=ids.indexOf(String(active.id)),to=ids.indexOf(String(over.id));if(from<0||to<0)return;
  const next=arrayMove(ids,from,to);void preference.save(next);
 }
 const name=(id:string|number)=>byId.get(String(id))?.property.name||'Property';
 return <DndContext id={contextId} sensors={sensors} collisionDetection={closestCenter} onDragStart={({active})=>{setActiveId(String(active.id));setDragging(true);}} onDragEnd={finish} onDragCancel={()=>{setActiveId(null);setDragging(false);}} accessibility={{screenReaderInstructions:{draggable:'To reorder a property, press Space. Use the arrow keys to move it, then press Space to drop. Press Escape to cancel.'},announcements:{onDragStart:({active})=>`Picked up ${name(active.id)}.`,onDragOver:({active,over})=>over?`${name(active.id)}, position ${ids.indexOf(String(over.id))+1} of ${ids.length}.`:undefined,onDragEnd:({active,over})=>over?`${name(active.id)} dropped at position ${ids.indexOf(String(over.id))+1} of ${ids.length}.`:'Reordering cancelled.',onDragCancel:()=> 'Reordering cancelled. Original order restored.'}}}>
  <SortableContext items={ids} strategy={rectSortingStrategy}>
   <div className={styles.grid}>{ids.map(id=><SortableCard key={id} detail={byId.get(id)!} actions={renderActions?.(byId.get(id)!)} disabled={disabled||!ready||!preference.ready||preference.saving||preference.readOnly||ids.length<2} reducedMotion={reducedMotion}/>)}{children}</div>
  </SortableContext>
  <span className={styles.srOnly} role="status">{preference.notice}</span>
  {preference.error&&<div className={styles.saveError} role="alert">{preference.error}<div><button type="button" className="secondary" disabled={preference.saving} onClick={()=>void preference.retry()}>Retry save</button><button type="button" className="secondary" disabled={preference.saving} onClick={preference.reload}>Reload saved order</button></div></div>}
  {ready&&createPortal(<DragOverlay dropAnimation={reducedMotion?null:{duration:280,easing,sideEffects:defaultDropAnimationSideEffects({styles:{active:{opacity:'0'}}})}}>{active?<div className={styles.overlay} aria-hidden="true"><MemberPropertyCard detail={active} preview handle={<span className={styles.handle}><Grip/></span>}/></div>:null}</DragOverlay>,document.body)}
 </DndContext>;
}
