'use client';

import {useEffect, useRef} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {switchDashboardPreview} from '@/app/dashboard/preview-actions';
import {useFormStatus} from 'react-dom';
import {signOut} from '@/app/signin/actions';

function PreviewSelect({people,selected}:{people:{id:string;name:string}[];selected?:string}){
 const {pending}=useFormStatus();
 return <label className="account-preview-label">View as<select aria-label="View as" name="person" value={selected||''} disabled={pending} onChange={event=>event.currentTarget.form?.requestSubmit()}><option value="">My admin account</option>{people.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select>{pending&&<small>Switching…</small>}</label>;
}
export function AccountMenu({authenticated=true,photoUrl,previewPeople,previewPersonId}: {photoUrl?:string|null;authenticated?:boolean;previewPeople?:{id:string;name:string}[];previewPersonId?:string}) {
  const pathname=usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const menu = menuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      const menu = menuRef.current;
      if (event.key === 'Escape' && menu?.open) {
        menu.open = false;
        menu.querySelector('summary')?.focus();
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  if(!authenticated)return null;

  return (
    <details ref={menuRef} className="account-menu">
      <summary aria-label="Open profile menu">
        <span className="account-avatar">{photoUrl?<img src={photoUrl} alt=""/>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21c.6-5.2 3.1-7.8 7.5-7.8s6.9 2.6 7.5 7.8" />
        </svg>}</span>
      </summary>
      <div className="account-menu-panel">
        {authenticated&&<Link href="/dashboard/profile" aria-current={pathname==='/dashboard/profile'?'page':undefined} onClick={()=>{if(menuRef.current)menuRef.current.open=false;}}>Profile &amp; Settings</Link>}
        {previewPeople&&<form action={switchDashboardPreview}><PreviewSelect people={previewPeople} selected={previewPersonId}/><input type="hidden" name="mode" value="draft"/></form>}
        {authenticated?<form action={signOut}><button className="account-menu-signout">Sign out</button></form>:<a href="/signin">Sign in</a>}
      </div>
    </details>
  );
}
