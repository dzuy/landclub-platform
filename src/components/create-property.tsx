'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {createProperty,syncNotionProperties} from '@/app/staff/properties/actions';
export function CreateProperty(){const [pending,start]=useTransition(),[error,setError]=useState('');const router=useRouter();return <div><button disabled={pending} onClick={()=>start(async()=>{const result=await createProperty();if(result.ok)router.push('/staff/properties/'+result.id);else setError(result.error);})}>{pending?'Creating…':'+ New property'}</button>{error&&<p role="alert">{error}</p>}</div>}

export function SyncNotionProperties(){const [pending,start]=useTransition(),[message,setMessage]=useState('');const router=useRouter();return <div><button className="secondary" disabled={pending} onClick={()=>start(async()=>{const r=await syncNotionProperties();setMessage(r.ok?`Created ${r.created} drafts, updated ${r.updated}, unchanged ${r.unchanged}. ${r.missing} missing from Notion.${r.conflicts.length?' Conflicts to review: '+r.conflicts.join(', '):''}`:r.error);router.refresh();})}>{pending?'Syncing…':'Sync from Notion'}</button><p className="cms-hint">Latest database fields · drafts only · app edits protected. Page text and media need separate review.</p>{message&&<p role="status">{message}</p>}</div>}
