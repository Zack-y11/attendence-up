import { UserButton } from '@clerk/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useApi } from '../api/context';
import { buttonClass, Icon, LiveDot } from './ui';

const links = [
  { to: '/', label: 'Dashboard', icon: 'space_dashboard', end: true },
  { to: '/classes', label: 'Classes', icon: 'school', end: false },
  { to: '/sessions', label: 'Sessions', icon: 'event_available', end: false },
];

function NavItems({ onNavigate, vertical = false }: { onNavigate?: () => void; vertical?: boolean }) {
  return (
    <nav className={`flex gap-1 ${vertical ? 'flex-col' : ''}`}>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-mist hover:text-ink'
            }`
          }
        >
          {vertical && <Icon name={link.icon} className="text-[20px]" />}
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img src="/logo.svg" alt="" className="h-8 w-8" />
      <span className="font-display text-lg font-semibold tracking-tight text-ink">Attendence-Up</span>
    </Link>
  );
}

function LiveIndicator() {
  const api = useApi();
  const sessions = useQuery({ queryKey: ['sessions', 'all'], queryFn: () => api.sessions('all') });
  const open = sessions.data?.filter((session) => session.status === 'OPEN') ?? [];
  const first = open[0];
  if (!first) return null;
  return (
    <Link
      to={open.length === 1 ? `/sessions/${first.id}` : '/sessions'}
      className="hidden items-center gap-2 rounded-full border border-teal/20 bg-teal-soft/50 px-3 py-1 text-xs font-semibold text-teal transition hover:bg-teal-soft lg:flex"
    >
      <LiveDot className="h-2 w-2" />
      {open.length === 1 ? `Live: ${first.name}` : `${open.length} sessions live`}
    </Link>
  );
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-card/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex items-center gap-6">
            <Brand />
            <div className="hidden md:block">
              <NavItems />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LiveIndicator />
            <Link to="/sessions/new" className={buttonClass('primary', 'hidden sm:inline-flex')}>
              <Icon name="add" className="text-[18px]" />
              New session
            </Link>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted md:hidden"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Icon name="menu" className="text-[20px]" />
            </button>
            <div className="border-l border-line pl-3">
              <UserButton />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
        <Outlet />
      </main>
      <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-5 text-xs text-muted md:px-8">
        <span>
          <span className="font-semibold text-ink">Attendence-Up</span> · Attendance sessions for classes and events
        </span>
        <span>Location is informational only, never used to reject a check-in.</span>
      </footer>
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-8 bg-card px-4 py-6 shadow-[0_20px_25px_-5px_rgba(15,23,42,0.08)]">
            <Brand />
            <NavItems vertical onNavigate={() => setMenuOpen(false)} />
            <Link to="/sessions/new" className={buttonClass()} onClick={() => setMenuOpen(false)}>
              <Icon name="add" className="text-[18px]" />
              New session
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
