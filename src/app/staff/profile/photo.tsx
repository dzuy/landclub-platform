'use client';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {MAX_PROFILE_PHOTO_BYTES} from '@/lib/profile-photo';
export function ProfilePhoto({initialUrl}:{initialUrl:string|null}){
 const [url,setUrl]=useState(initialUrl),[pending,setPending]=useState(false),[error,setError]=useState('');
 const input=useRef<HTMLInputElement>(null),lock=useRef(false),router=useRouter();
 async function upload(file:File){
  if(lock.current)return;setError('');
  if(file.size>MAX_PROFILE_PHOTO_BYTES){setError('Choose a photo under 10 MiB.');return;}
  lock.current=true;setPending(true);
  try{
   const form=new FormData();form.set('file',file);
   const response=await fetch('/api/profile-photo',{method:'POST',body:form}),result=await response.json();
   if(!response.ok)throw new Error(result.error||'Unable to upload your photo.');
   setUrl(result.url);router.refresh();
  }catch(error){setError(error instanceof Error?error.message:'Unable to upload your photo. Please try again.');}
  finally{lock.current=false;setPending(false);}
 }
 return <section className="profile-photo-section" aria-labelledby="profile-photo-title">
  <div className="profile-photo-preview">{url?<img src={url} alt="Your profile photo"/>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-label="No profile photo" role="img"><circle cx="12" cy="8" r="4"/><path d="M4 22c0-6 3-9 8-9s8 3 8 9"/></svg>}</div>
  <div><h2 id="profile-photo-title">Profile photo</h2><p className="muted">JPG, PNG, WebP or GIF · Up to 10 MiB. Photos are centered and cropped to fit.</p>
  <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void upload(file);}}/>
  <button type="button" className="secondary" disabled={pending} onClick={()=>input.current?.click()}>{pending?'Uploading…':url?'Change photo':'Upload photo'}</button>
  {error&&<p role="alert" className="cms-error">{error}</p>}</div>
 </section>;
}
