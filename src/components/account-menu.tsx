'use client';

import {useEffect, useRef} from 'react';
import {signOut} from '@/app/signin/actions';

export function AccountMenu({email, role}: {email: string; role: string}) {
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

  return (
    <details ref={menuRef} className="account-menu">
      <summary aria-label="Open profile menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21c.6-5.2 3.1-7.8 7.5-7.8s6.9 2.6 7.5 7.8" />
        </svg>
      </summary>
      <div className="account-menu-panel">
        <div><span className="account-menu-label">Signed in as</span><strong>{email}</strong></div>
        <div><span className="account-menu-label">Role</span><span>{role}</span></div>
        <form action={signOut}><button className="account-menu-signout">Sign out</button></form>
      </div>
    </details>
  );
}
