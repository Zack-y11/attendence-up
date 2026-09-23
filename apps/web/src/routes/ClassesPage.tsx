import { CLASS_STATUS_LABELS, type ClassDto, type ClassStatus, type SessionDto } from '@attendence-up/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '../api/context';
import {
  buttonClass,
  EmptyState,
  ErrorBlock,
  Icon,
  LoadingBlock,
  PageHeader,
  SearchInput,
  SegmentedTabs,
  StatusPill,
} from '../components/ui';
import { formatWhen } from '../lib/datetime';

type Filter = ClassStatus | 'ALL';

export function ClassesPage() {
  const api = useApi();
  const classes = useQuery({ queryKey: ['classes'], queryFn: () => api.classes() });
  const sessions = useQuery({ queryKey: ['sessions', 'all'], queryFn: () => api.sessions('all') });
  const [filter, setFilter] = useState<Filter>('ACTIVE');
  const [search, setSearch] = useState('');

  const list = classes.data ?? [];
  const query = search.trim().toLowerCase();
  const visible = list.filter(
    (item) =>
      (filter === 'ALL' || item.status === filter) &&
      (!query || item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query)),
  );
  const count = (status: ClassStatus) => list.filter((item) => item.status === status).length;

  return (
    <div>
      <PageHeader
        eyebrow="Course roster"
        title="Classes"
        description="A class is the course or group. Each meeting is its own attendance session."
        action={
          <Link to="/classes/new" className={buttonClass()}>
            <Icon name="add" className="text-[18px]" />
            New class
          </Link>
        }
      />
      {classes.isLoading && <LoadingBlock label="Loading classes" />}
      {classes.isError && <ErrorBlock error={classes.error} />}
      {classes.data && list.length === 0 && (
        <EmptyState
          icon="school"
          title="No classes yet"
          body="Create a class to keep every session for the same course together, or start with a standalone session."
          action={
            <Link to="/classes/new" className={buttonClass()}>
              New class
            </Link>
          }
        />
      )}
      {classes.data && list.length > 0 && (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SegmentedTabs
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'ACTIVE', label: 'Active', count: count('ACTIVE') },
                { value: 'ARCHIVED', label: 'Archived', count: count('ARCHIVED') },
                { value: 'ALL', label: 'All', count: list.length },
              ]}
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Search classes…" />
          </div>
          {visible.length === 0 ? (
            <EmptyState icon="search_off" title="No classes match" body="Try another filter or search term." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((item) => (
                <ClassCard key={item.id} item={item} sessions={sessions.data ?? []} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ClassCard({ item, sessions }: { item: ClassDto; sessions: SessionDto[] }) {
  const classSessions = sessions.filter((session) => session.classId === item.id);
  const live = classSessions.find((session) => session.status === 'OPEN');
  const checkIns = classSessions.reduce((sum, session) => sum + session.attendanceCount, 0);
  const archived = item.status === 'ARCHIVED';

  return (
    <article
      className={`flex flex-col rounded-xl border bg-card p-5 shadow-card transition hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.07)] ${
        live ? 'border-accent/40 ring-1 ring-accent/20' : 'border-line'
      } ${archived ? 'opacity-80' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/classes/${item.id}`}
            className="block truncate font-display text-lg font-semibold tracking-tight hover:text-accent"
          >
            {item.name}
          </Link>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">{item.description || 'No description yet.'}</p>
        </div>
        {live ? (
          <StatusPill tone="live">Live</StatusPill>
        ) : (
          <StatusPill tone={archived ? 'closed' : 'good'}>{CLASS_STATUS_LABELS[item.status]}</StatusPill>
        )}
      </div>

      <div className="mt-4 grid gap-1.5 text-sm text-muted">
        <span className="flex items-center gap-2">
          <Icon name="event_note" className="text-[16px]" />
          {item.sessionCount} session{item.sessionCount === 1 ? '' : 's'} · {checkIns} check-ins
        </span>
        <span className="flex items-center gap-2">
          <Icon name={item.location ? 'my_location' : 'location_off'} className="text-[16px]" />
          {item.location ? `Default classroom · ${item.location.radiusMeters} m radius` : 'No default location'}
        </span>
        <span className="flex items-center gap-2">
          <Icon name="calendar_today" className="text-[16px]" />
          Created {formatWhen(item.createdAt)}
        </span>
      </div>

      {live && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-teal-soft/50 px-3 py-2 text-xs">
          <span className="truncate font-semibold text-teal">{live.name}</span>
          <span className="font-semibold tabular-nums text-teal">{live.attendanceCount} checked in</span>
        </div>
      )}

      <div className="mt-5 flex gap-2 border-t border-mist pt-4">
        <Link to={`/classes/${item.id}`} className={buttonClass('secondary', 'flex-1')}>
          <Icon name="tune" className="text-[18px]" />
          Manage
        </Link>
        {live ? (
          <Link to={`/sessions/${live.id}`} className={buttonClass('primary', 'flex-1')}>
            <Icon name="monitoring" className="text-[18px]" />
            Inspect live
          </Link>
        ) : (
          !archived && (
            <Link to={`/classes/${item.id}/sessions/new`} className={buttonClass('primary', 'flex-1')}>
              <Icon name="play_arrow" className="text-[18px]" />
              New session
            </Link>
          )
        )}
      </div>
    </article>
  );
}
