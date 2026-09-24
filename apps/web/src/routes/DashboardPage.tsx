import type { ClassDto, SessionDto, SessionStatus } from '@attendence-up/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatFullDate, formatWhen } from '../lib/datetime';
import { useCopy } from '../lib/useCopy';

type Filter = 'ALL' | SessionStatus;

export function DashboardPage() {
  const { t } = useTranslation();
  const api = useApi();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.me() });
  const classes = useQuery({ queryKey: ['classes'], queryFn: () => api.classes() });
  const sessions = useQuery({ queryKey: ['sessions', 'all'], queryFn: () => api.sessions('all') });
  const [filter, setFilter] = useState<Filter>('ALL');

  if (me.isLoading || classes.isLoading || sessions.isLoading) return <LoadingBlock label={t('dashboard.loading')} />;
  if (me.isError) return <ErrorBlock error={me.error} />;
  if (classes.isError) return <ErrorBlock error={classes.error} />;
  if (sessions.isError) return <ErrorBlock error={sessions.error} />;

  const profile = me.data;
  const classList = classes.data;
  const sessionList = sessions.data;
  if (!profile || !classList || !sessionList) return <LoadingBlock label={t('dashboard.loading')} />;

  const openSessions = sessionList.filter((session) => session.status === 'OPEN');
  const drafts = sessionList.filter((session) => session.status === 'DRAFT');
  const activeClasses = classList.filter((item) => item.status === 'ACTIVE');
  const archivedCount = classList.length - activeClasses.length;
  const totalCheckIns = sessionList.reduce((sum, session) => sum + session.attendanceCount, 0);
  const live = openSessions[0];
  const firstName = profile.displayName.split(' ')[0] ?? '';
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
              {formatFullDate(new Date())}
            </span>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-[2rem] sm:leading-10">
              {firstName ? t('dashboard.welcome', { name: firstName }) : t('dashboard.welcomeAnonymous')}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted">
              {live ? (
                <>
                  {t('dashboard.youHave')}{' '}
                  <span className="font-semibold text-accent">
                    {t('dashboard.collecting', { count: openSessions.length })}
                  </span>{' '}
                  {t('dashboard.checkInsSoFar', {
                    count: openSessions.reduce((sum, session) => sum + session.attendanceCount, 0),
                  })}
                </>
              ) : (
                t('dashboard.idle')
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/classes/new" className={buttonClass('secondary')}>
              <Icon name="add_circle" className="text-[18px]" />
              {t('dashboard.newClass')}
            </Link>
            <Link to="/sessions/new" className={buttonClass()}>
              <Icon name="sensors" className="text-[18px]" />
              {t('dashboard.standalone')}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t('dashboard.liveNow')}
          value={openSessions.length}
          unit={t('common.session', { count: openSessions.length })}
          icon="sensors"
          live={openSessions.length > 0}
          tone="teal"
          caption={
            live
              ? t('dashboard.liveCaption', { name: live.name, count: live.attendanceCount })
              : t('dashboard.nothingOpen')
          }
        />
        <MetricCard
          label={t('dashboard.activeClasses')}
          value={activeClasses.length}
          icon="school"
          caption={archivedCount ? t('dashboard.archivedCount', { count: archivedCount }) : t('dashboard.noneArchived')}
        />
        <MetricCard
          label={t('dashboard.checkInsRecorded')}
          value={totalCheckIns}
          icon="how_to_reg"
          tone="teal"
          caption={t('dashboard.acrossSessions', { count: sessionList.length })}
        />
        <MetricCard
          label={t('dashboard.draftsReady')}
          value={drafts.length}
          icon="edit_calendar"
          tone="neutral"
          caption={drafts.length ? t('dashboard.readyToOpen') : t('dashboard.noDrafts')}
        />
      </section>

      {live && <LiveSpotlight session={live} />}

      <section>
        <SectionTitle
          action={
            <Link to="/classes" className="text-xs font-semibold text-accent hover:underline">
              {t('dashboard.manageClasses')}
            </Link>
          }
        >
          {t('dashboard.myClasses')}
        </SectionTitle>
        {activeClasses.length === 0 ? (
          <EmptyState
            icon="school"
            title={t('dashboard.noActiveTitle')}
            body={t('dashboard.noActiveBody')}
            action={
              <Link to="/classes/new" className={buttonClass()}>
                {t('dashboard.newClass')}
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
                { value: 'ALL', label: t('common.all'), count: sessionList.length },
                { value: 'OPEN', label: t('common.open'), count: count('OPEN') },
                { value: 'DRAFT', label: t('common.drafts'), count: count('DRAFT') },
                { value: 'CLOSED', label: t('common.closed'), count: count('CLOSED') },
              ]}
            />
          }
        >
          {t('dashboard.recent')}
        </SectionTitle>
        <SessionsTable rows={filtered.slice(0, 8)} empty={t('dashboard.noFilterMatch')} />
        {filtered.length > 8 && (
          <div className="mt-3 text-right">
            <Link to="/sessions" className="text-xs font-semibold text-accent hover:underline">
              {t('dashboard.viewAll', { count: filtered.length })}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function LiveSpotlight({ session }: { session: SessionDto }) {
  const { t } = useTranslation();
  const { copied, error: copyError, copy } = useCopy();
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
              <StatusPill tone="live">{t('common.live')}</StatusPill>
            </div>
            <p className="text-sm text-muted">
              {session.className ?? t('dashboard.standalone')}
              {session.location
                ? ` · ${t('dashboard.expectedRadius', { radius: session.location.radiusMeters })}`
                : ` · ${t('dashboard.noClassroom')}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg bg-card px-3 py-1.5 text-xs shadow-sm">
            <Icon name="timer" className="text-[16px] text-teal" />
            <span className="text-muted">{t('dashboard.closes')}</span>
            <span className="font-semibold">{formatWhen(session.attendanceClosesAt)}</span>
          </span>
          <Link to={`/sessions/${session.id}`} className={buttonClass()}>
            <Icon name="monitoring" className="text-[18px]" />
            {t('dashboard.inspectLive')}
          </Link>
        </div>
      </div>
      <div className="grid gap-4 p-5 lg:grid-cols-12 lg:items-center">
        <div className="flex items-baseline gap-2 lg:col-span-3">
          <span className="font-display text-[2.5rem] leading-none font-semibold tracking-tight text-accent">
            {session.attendanceCount}
          </span>
          <span className="text-sm text-muted">{t('dashboard.checkInsLabel')}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-paper px-3 py-2 lg:col-span-9">
          <Icon name="link" className="text-[18px] text-muted" />
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink">{link}</span>
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold hover:bg-accent-soft ${copyError ? 'text-danger' : 'text-accent'}`}
            title={copyError ? t('errors.copyFailed') : undefined}
            onClick={() => void copy(link)}
          >
            <Icon name={copied ? 'check' : copyError ? 'error' : 'content_copy'} className="text-[16px]" />
            {copied ? t('common.copied') : copyError ? t('common.copyFailed') : t('common.copyLink')}
            {copyError ? <span className="sr-only">{t('errors.copyFailed')}</span> : null}
          </button>
        </div>
      </div>
    </Card>
  );
}

function ClassTile({ item, sessions }: { item: ClassDto; sessions: SessionDto[] }) {
  const { t } = useTranslation();
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
        {liveCount ? <StatusPill tone="live">{t('common.live')}</StatusPill> : <StatusPill tone="good">{t('status.class.ACTIVE')}</StatusPill>}
      </div>
      <h3 className="mt-3 font-display text-base font-semibold tracking-tight group-hover:text-accent">{item.name}</h3>
      <p className="mt-0.5 line-clamp-2 min-h-8 text-xs text-muted">{item.description || t('common.noDescription')}</p>
      <div className="mt-4 flex items-end justify-between border-t border-mist pt-3 text-xs">
        <div>
          <span className="block text-muted">{t('common.sessions')}</span>
          <span className="font-semibold tabular-nums">{item.sessionCount}</span>
        </div>
        <div className="text-right">
          <span className="block text-muted">{t('common.checkIns')}</span>
          <span className="font-semibold tabular-nums">{checkIns}</span>
        </div>
      </div>
    </Link>
  );
}
