'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isActive = (path: string) => pathname === path;
  const handleSignOut = async () => {
    setIsProfileOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/');
    router.refresh();
  };

  return (
    <nav
      className="h-14 border-b bg-white flex items-center justify-between transition-colors"
      style={{
        borderBottomWidth: '0.5px',
        borderColor: '#E5E5E5'
      }}
    >
      <div className="flex items-center" style={{ paddingLeft: '20px' }}>
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#000' }}>
          Newsroom
        </span>
      </div>

      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-[#F5F5F5] p-1 rounded-full">
        <Link
          href="/dashboard"
          className="transition-all"
          style={{
            fontSize: '13px',
            fontWeight: 400,
            color: isActive('/dashboard') ? '#000' : '#666',
            textDecoration: 'none',
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingTop: '6px',
            paddingBottom: '6px',
            borderRadius: '999px',
            backgroundColor: isActive('/dashboard') ? '#fff' : 'transparent',
            boxShadow: isActive('/dashboard') ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
          }}
        >
          Dashboard
        </Link>
        <Link
          href="/manage-base"
          className="transition-all"
          style={{
            fontSize: '13px',
            fontWeight: 400,
            color: isActive('/manage-base') ? '#000' : '#666',
            textDecoration: 'none',
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingTop: '6px',
            paddingBottom: '6px',
            borderRadius: '999px',
            backgroundColor: isActive('/manage-base') ? '#fff' : 'transparent',
            boxShadow: isActive('/manage-base') ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
          }}
        >
          Manage base
        </Link>
        <Link
          href="/manage-design"
          className="transition-all"
          style={{
            fontSize: '13px',
            fontWeight: 400,
            color: isActive('/manage-design') ? '#000' : '#666',
            textDecoration: 'none',
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingTop: '6px',
            paddingBottom: '6px',
            borderRadius: '999px',
            backgroundColor: isActive('/manage-design') ? '#fff' : 'transparent',
            boxShadow: isActive('/manage-design') ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
          }}
        >
          Manage design
        </Link>
      </div>

      <div className="flex items-center gap-3" style={{ paddingRight: '20px' }}>
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setIsProfileOpen(true)}
          onMouseLeave={() => setIsProfileOpen(false)}
        >
          <button
            className="rounded-full flex items-center justify-center transition-all"
            aria-haspopup="menu"
            aria-expanded={isProfileOpen}
            style={{
              width: '28px',
              height: '28px',
              backgroundColor: '#E5E5E5',
              fontSize: '11px',
              fontWeight: 500,
              color: '#000',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            JS
          </button>

          {isProfileOpen && (
            <>
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '28px',
                  right: 0,
                  width: '132px',
                  height: '8px',
                  zIndex: 49
                }}
              />
              <div
                role="menu"
                className="bg-white"
                style={{
                  position: 'absolute',
                  top: '36px',
                  right: 0,
                  width: '132px',
                  padding: '6px',
                  border: '0.5px solid #E5E5E5',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                  zIndex: 50
                }}
              >
                <button
                  role="menuitem"
                  className="transition-all"
                  style={{
                    width: '100%',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    paddingLeft: '10px',
                    paddingRight: '10px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '7px',
                    color: '#000',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 400,
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onClick={handleSignOut}
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
