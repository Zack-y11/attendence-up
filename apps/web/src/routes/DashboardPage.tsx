import type { ClassDto, SessionDto, SessionStatus } from '@attendence-up/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '../api/context';
import { SessionsTable } from '../components/SessionsTable';
import {
  buttonClass,
  Card,
  EmptyState,
  ErrorBlock,
  Icon,
  LoadingBlock,
  MetricCard,
  SectionTitle,
  SegmentedTabs,
  StatusPill,
} from '../components/ui';
import { formatWhen } from '../lib/datetime';
import { useCopy } from '../lib/useCopy';

type Filter = 'ALL' | SessionStatus;

export function DashboardPage() {
  const api = useApi();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.me() });
  const classes = useQuery({ queryKey: ['classes'], queryFn: () => api.classes() });
  const sessions = useQuery({ queryKey: ['sessions', 'all'], queryFn: () => api.sessions('all') });
  const [filter, setFilter] = useState<Filter>('ALL');

  if (me.isLoading || classes.isLoading || sessions.isLoading) return <LoadingBlock label="Loading your desk" />;
  if (me.isError) return <ErrorBlock error={me.error} />;
  if (classes.isError) return <ErrorBlock error={classes.error} />;
  if (sessions.isError) return <ErrorBlock error={sessions.error} />;

  const profile = me.data;
  const classList = classes.data;
  const sessionList = sessions.data;
  if (!profile || !classList || !sessionList) return <LoadingBlock label="Loading your desk" />;

  const openSessions = sessionList.filter((session) => session.status === 'OPEN');
  const drafts = sessionList.filter((session) => session.status === 'DRAFT');
  const activeClasses = classList.filter((item) => item.status === 'ACTIVE');
  const archivedCount = classList.length - activeClasses.length;
  const totalCheckIns = sessionList.reduce((sum, session) => sum + session.attendanceCount, 0);
  const live = openSessions[0];
  const firstName = profile.displayName.split(' ')[0] || 'there';
  const filtered = filter === 'ALL' ? sessionList : sessionList.filter((session) => session.status === filter);
  const count = (status: SessionStatus) => sessionList.filter((session) => session.status === status).length;

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-xl bg-[#f2f3ff] p-6 shadow-card lg:p-8">
        <div className="pointer-events-none absolute -top-16 -right-16 h-80 w-80 rounded-full bg-teal-soft/60 blur-3xl" />
        <div className="pointer-events-none absolute right-40 -bottom-20 h-72 w-72 rounded-full bg-accent-soft/70 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaedff] px-2.5 py-0.5 text-xs font-semibold text-muted">
              <Icon name="calendar_today" className="text-[14px] text-teal" />
              {new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date())}
            </span>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-[2rem] sm:leading-10">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted">
              {live ? (
                <>
                  You have{' '}
                  <span className="font-semibold text-accent">
                    {openSessions.length} session{openSessions.length === 1 ? '' : 's'} collecting attendance
                  </span>{' '}
                  with {openSessions.reduce((sum, session) => sum + session.attendanceCount, 0)} check-ins so far.
                </>
              ) : (
                'No session is collecting attendance right now. Open a class session or start a standalone one.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/classes/new" className={buttonClass('secondary')}>
              <Icon name="add_circle" className="text-[18px]" />
              New class
            </Link>
            <Link to="/sessions/new" className={buttonClass()}>
              <Icon name="sensors" className="text-[18px]" />
              Standalone session
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Live now"
          value={openSessions.length}
          unit={openSessions.length === 1 ? 'session' : 'sessions'}
          icon="sensors"
          live={openSessions.length > 0}
          tone="teal"
          caption={live ? `${live.name} · ${live.attendanceCount} checked in` : 'Nothing open'}
        />
        <MetricCard
          label="Active classes"
          value={activeClasses.length}
          icon="school"
          caption={archivedCount ? `${archivedCount} archived` : 'None archived'}
        />
        <MetricCard
          label="Check-ins recorded"
          value={totalCheckIns}
          icon="how_to_reg"
          tone="teal"
          caption={`Across ${sessionList.length} session${sessionList.length === 1 ? '' : 's'}`}
        />
        <MetricCard
          label="Drafts ready"
          value={drafts.length}
          icon="edit_calendar"
          tone="neutral"
          caption={drafts.length ? 'Ready to open' : 'No drafts waiting'}
        />
      </section>

      {live && <LiveSpotlight session={live} />}

      <section>
        <SectionTitle
          action={
            <Link to="/classes" className="text-xs font-semibold text-accent hover:underline">
              Manage all classes →
            </Link>
          }
        >
          My active classes
        </SectionTitle>
        {activeClasses.length === 0 ? (
          <EmptyState
            icon="school"
            title="No active classes"
            body="A class keeps the history of every session you run for the same course or group."
            action={
              <Link to="/classes/new" className={buttonClass()}>
                New class
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {activeClasses.slice(0, 4).map((item) => (
              <ClassTile key={item.id} item={item} sessions={sessionList} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          action={
            <SegmentedTabs
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'ALL', label: 'All', count: sessionList.length },
                { value: 'OPEN', label: 'Open', count: count('OPEN') },
                { value: 'DRAFT', label: 'Drafts', count: count('DRAFT') },
                { value: 'CLOSED', label: 'Closed', count: count('CLOSED') },
              ]}
            />
          }
        >
          Recent sessions
        </SectionTitle>
        <SessionsTable rows={filtered.slice(0, 8)} empty="No sessions match this filter." />
        {filtered.length > 8 && (
          <div className="mt-3 text-right">
            <Link to="/sessions" className="text-xs font-semibold text-accent hover:underline">
              View all {filtered.length} sessions →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function LiveSpotlight({ session }: { session: SessionDto }) {
  const { copied, copy } = useCopy();
  const link = `${window.location.origin}${session.publicPath}`;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 bg-[#f2f3ff]/60 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-white shadow-sm">
            <Icon name="podium" className="text-[26px]" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-soft opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-[#86f2e4]" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold tracking-tight">{session.name}</h2>
              <StatusPill tone="live">Live</StatusPill>
            </div>
            <p className="text-sm text-muted">
              {session.className ?? 'Standalone session'}
              {session.location ? ` · ${session.location.radiusMeters} m expected radius` : ' · No classroom location'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg bg-card px-3 py-1.5 text-xs shadow-sm">
            <Icon name="timer" className="text-[16px] text-teal" />
            <span className="text-muted">Closes</span>
            <span className="font-semibold">{formatWhen(session.attendanceClosesAt)}</span>
          </span>
          <Link to={`/sessions/${session.id}`} className={buttonClass()}>
            <Icon name="monitoring" className="text-[18px]" />
            Inspect live
          </Link>
        </div>
      </div>
      <div className="grid gap-4 p-5 lg:grid-cols-12 lg:items-center">
        <div className="flex items-baseline gap-2 lg:col-span-3">
          <span className="font-display text-[2.5rem] leading-none font-semibold tracking-tight text-accent">
            {session.attendanceCount}
          </span>
          <span className="text-sm text-muted">check-ins so far</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-paper px-3 py-2 lg:col-span-9">
          <Icon name="link" className="text-[18px] text-muted" />
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink">{link}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-accent hover:bg-accent-soft"
            onClick={() => void copy(link)}
          >
            <Icon name={copied ? 'check' : 'content_copy'} className="text-[16px]" />
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </div>
    </Card>
  );
}

function ClassTile({ item, sessions }: { item: ClassDto; sessions: SessionDto[] }) {
  const classSessions = sessions.filter((session) => session.classId === item.id);
  const liveCount = classSessions.filter((session) => session.status === 'OPEN').length;
  const checkIns = classSessions.reduce((sum, session) => sum + session.attendanceCount, 0);

  return (
    <Link
      to={`/classes/${item.id}`}
      className={`group flex flex-col rounded-xl border bg-card p-4 shadow-card transition hover:border-line-strong hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.07)] ${
        liveCount ? 'border-accent/40 ring-1 ring-accent/20' : 'border-line'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
          <Icon name="school" className="text-[18px]" />
        </span>
        {liveCount ? <StatusPill tone="live">Live</StatusPill> : <StatusPill tone="good">Active</StatusPill>}
      </div>
      <h3 className="mt-3 font-display text-base font-semibold tracking-tight group-hover:text-accent">{item.name}</h3>
      <p className="mt-0.5 line-clamp-2 min-h-8 text-xs text-muted">{item.description || 'No description yet.'}</p>
      <div className="mt-4 flex items-end justify-between border-t border-mist pt-3 text-xs">
        <div>
          <span className="block text-muted">Sessions</span>
          <span className="font-semibold tabular-nums">{item.sessionCount}</span>
        </div>
        <div className="text-right">
          <span className="block text-muted">Check-ins</span>
          <span className="font-semibold tabular-nums">{checkIns}</span>
        </div>
      </div>
    </Link>
  );
}
