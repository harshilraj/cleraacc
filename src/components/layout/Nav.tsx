'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Workspace', icon: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M2 2h5v6H2V2zm6 0h5v3H8V2zM8 7h5v6H8V7zM2 10h5v3H2v-3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  )},
  { href: '/sources', label: 'Sources', icon: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M2 3h11M2 7h8M2 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )},
  { href: '/pipeline', label: 'Pipeline', icon: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <rect x="1" y="2" width="3" height="11" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="6" y="2" width="3" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="11" y="2" width="3" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )},
  { href: '/settings', label: 'Settings', icon: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M7.5 9.5a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M12.3 7.5a4.8 4.8 0 00-.1-.9l1.4-1.1-1.3-2.2-1.7.6a4.8 4.8 0 00-1.6-.9L8.8 1.5h-2.6l-.2 1.5a4.8 4.8 0 00-1.6.9l-1.7-.6L1.4 5.5l1.4 1.1a4.8 4.8 0 000 1.8L1.4 9.5l1.3 2.2 1.7-.6c.5.4 1 .7 1.6.9l.2 1.5h2.6l.2-1.5c.6-.2 1.1-.5 1.6-.9l1.7.6 1.3-2.2-1.4-1.1c.1-.3.1-.6.1-.9z" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )},
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 gap-1"
      style={{
        height: 'var(--nav-h)',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--mist)',
        boxShadow: 'var(--shadow-xs)',
      }}
      aria-label="Main navigation"
    >
      {/* Wordmark */}
      <Link
        href="/"
        className="flex items-center gap-2 mr-6 flex-shrink-0"
        aria-label="Content Studio home"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect width="24" height="24" rx="6" fill="var(--accent)" />
          <path
            d="M7 12h3m0 0l-1.5-2.5m1.5 2.5l-1.5 2.5M13 8.5v7m2.5-5L13 15.5m0-5l2.5 5"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm font-semibold text-ink hidden sm:block" style={{ fontFamily: 'var(--font-display)' }}>
          Content Studio
        </span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-0.5 flex-1">
        {NAV_LINKS.map((link) => {
          const isActive = link.href === '/'
            ? pathname === '/'
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--ink-muted)',
                background: isActive ? 'var(--accent-dim)' : 'transparent',
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              {link.icon}
              <span className="hidden sm:block">{link.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      <button
        id="logout-btn"
        onClick={handleLogout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-ink-subtle hover:text-ink hover:bg-mist transition-colors ml-auto"
        aria-label="Sign out"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="hidden sm:block">Sign out</span>
      </button>
    </nav>
  );
}
