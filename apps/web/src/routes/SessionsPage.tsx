import type { SessionStatus } from '@attendence-up/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useApi } from '../api/context';
import { paths } from '../lib/paths';
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
  const { t } = useTranslation();
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
        eyebrow={t('sessions.eyebrow')}
        title={t('sessions.title')}
        description={t('sessions.description')}
        action={
          <Link to={paths.sessionNew} className={buttonClass()}>
            <Icon name="add" className="text-[18px]" />
            {t('sessions.standalone')}
          </Link>
        }
      />
      {sessions.isLoading && <LoadingBlock label={t('sessions.loading')} />}
      {sessions.isError && <ErrorBlock error={sessions.error} />}
      {sessions.data && (
        <>
          <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label={t('common.open')} value={count('OPEN')} icon="sensors" tone="teal" live={count('OPEN') > 0} caption={t('sessions.collecting')} />
            <MetricCard label={t('common.drafts')} value={count('DRAFT')} icon="edit_calendar" tone="neutral" caption={t('sessions.notYetOpen')} />
            <MetricCard label={t('common.closed')} value={count('CLOSED')} icon="lock" tone="neutral" caption={t('sessions.finished')} />
            <MetricCard label={t('common.checkIns')} value={checkIns} icon="how_to_reg" caption={t('sessions.across')} />
          </section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SegmentedTabs
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'ALL', label: t('common.all'), count: list.length },
                { value: 'OPEN', label: t('common.open'), count: count('OPEN') },
                { value: 'DRAFT', label: t('common.drafts'), count: count('DRAFT') },
                { value: 'CLOSED', label: t('common.closed'), count: count('CLOSED') },
              ]}
            />
            <SearchInput value={search} onChange={setSearch} placeholder={t('sessions.search')} />
          </div>
          <SessionsTable
            rows={visible}
            empty={list.length === 0 ? t('sessions.empty') : t('sessions.noMatch')}
          />
        </>
      )}
    </div>
  );
}
