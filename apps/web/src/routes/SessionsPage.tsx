import type { SessionStatus } from '@attendence-up/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '../api/context';
import { SessionsTable } from '../components/SessionsTable';
import {
  buttonClass,
  ErrorBlock,
  Icon,
  LoadingBlock,
  MetricCard,
  PageHeader,
  SearchInput,
  SegmentedTabs,
} from '../components/ui';

type Filter = SessionStatus | 'ALL';

export function SessionsPage() {
  const api = useApi();
  const sessions = useQuery({ queryKey: ['sessions', 'all'], queryFn: () => api.sessions('all') });
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');

  const list = sessions.data ?? [];
  const query = search.trim().toLowerCase();
  const visible = list.filter(
    (session) =>
      (filter === 'ALL' || session.status === filter) &&
      (!query ||
        session.name.toLowerCase().includes(query) ||
        (session.className ?? '').toLowerCase().includes(query)),
  );
  const count = (status: SessionStatus) => list.filter((session) => session.status === status).length;
  const checkIns = list.reduce((sum, session) => sum + session.attendanceCount, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Attendance log"
        title="Sessions"
        description="Class sessions and standalone sessions live in the same list."
        action={
          <Link to="/sessions/new" className={buttonClass()}>
            <Icon name="add" className="text-[18px]" />
            Standalone session
          </Link>
        }
      />
      {sessions.isLoading && <LoadingBlock label="Loading sessions" />}
      {sessions.isError && <ErrorBlock error={sessions.error} />}
      {sessions.data && (
        <>
          <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Open" value={count('OPEN')} icon="sensors" tone="teal" live={count('OPEN') > 0} caption="Collecting attendance" />
            <MetricCard label="Drafts" value={count('DRAFT')} icon="edit_calendar" tone="neutral" caption="Not yet open" />
            <MetricCard label="Closed" value={count('CLOSED')} icon="lock" tone="neutral" caption="Finished sessions" />
            <MetricCard label="Check-ins" value={checkIns} icon="how_to_reg" caption="Across every session" />
          </section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SegmentedTabs
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'ALL', label: 'All', count: list.length },
                { value: 'OPEN', label: 'Open', count: count('OPEN') },
                { value: 'DRAFT', label: 'Drafts', count: count('DRAFT') },
                { value: 'CLOSED', label: 'Closed', count: count('CLOSED') },
              ]}
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Search session or class…" />
          </div>
          <SessionsTable
            rows={visible}
            empty={list.length === 0 ? 'Your sessions will show up here.' : 'No sessions match this filter.'}
          />
        </>
      )}
    </div>
  );
}
