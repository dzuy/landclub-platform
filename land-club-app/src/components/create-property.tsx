'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {createProperty} from '@/app/staff/properties/actions';
export function CreateProperty(){const [pending,start]=useTransition(),[error,setError]=useState('');const router=useRouter();return <div><button disabled={pending} onClick={()=>start(async()=>{const result=await createProperty();if(result.ok)router.push('/staff/properties/'+result.id);else setError(result.error);})}>{pending?'Creating…':'+ New property'}</button>{error&&<p role="alert">{error}</p>}</div>}
