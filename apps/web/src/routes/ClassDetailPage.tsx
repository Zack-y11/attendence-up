import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { useApi } from '../api/context';
import { ClassAttendanceSection } from '../components/ClassAttendanceTable';
import { ClassForm } from '../components/ClassForm';
import { SessionsTable } from '../components/SessionsTable';
import {
  Button,
  buttonClass,
  Card,
  ErrorBlock,
  Icon,
  LoadingBlock,
  MetricCard,
  PageHeader,
  SectionTitle,
  StatusPill,
} from '../components/ui';
import { formatMeeting, formatWhen } from '../lib/datetime';

export function ClassDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const api = useApi();
  const course = useQuery({ queryKey: ['class', id], queryFn: () => api.class(id) });

  if (course.isLoading) return <LoadingBlock label={t('classDetail.loading')} />;
  if (course.isError) return <ErrorBlock error={course.error} />;
  if (!course.data) return null;
  const item = course.data;
  const open = item.sessions.filter((session) => session.status === 'OPEN');
  const checkIns = item.sessions.reduce((sum, session) => sum + session.attendanceCount, 0);
  const closed = item.sessions.filter((session) => session.status === 'CLOSED');
  const average = closed.length
    ? Math.round(closed.reduce((sum, session) => sum + session.attendanceCount, 0) / closed.length)
    : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <PageHeader
          eyebrow={
            <span className="flex items-center gap-1.5 normal-case">
              <Link to="/classes" className="text-muted hover:text-accent">
                {t('nav.classes')}
              </Link>
              <Icon name="chevron_right" className="text-[14px] text-muted" />
              <StatusPill tone={item.status === 'ACTIVE' ? 'good' : 'closed'}>
                {t(`status.class.${item.status}`)}
              </StatusPill>
            </span>
          }
          title={item.name}
          description={item.description || t('common.noDescription')}
          action={
            item.status === 'ACTIVE' ? (
              <ClassSessionActions classId={item.id} latestSessionId={item.sessions[0]?.id} />
            ) : null
          }
        />
        <div className="-mt-3 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 font-medium text-muted">
            <Icon name={item.location ? 'my_location' : 'location_off'} className="text-[14px]" />
            {item.location
              ? t('classDetail.coords', {
                  lat: item.location.latitude.toFixed(5),
                  lng: item.location.longitude.toFixed(5),
                  radius: item.location.radiusMeters,
                })
              : t('classes.noLocation')}
          </span>
          {(item.startsAt || item.endsAt) && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 font-medium text-muted">
              <Icon name="schedule" className="text-[14px]" />
              {formatMeeting(item.startsAt, item.endsAt)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 font-medium text-muted">
            <Icon name="calendar_today" className="text-[14px]" />
            {t('common.created', { when: formatWhen(item.createdAt) })}
          </span>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t('common.sessions')}
          value={item.sessions.length}
          icon="event_note"
          caption={t('classDetail.closedCount', { count: closed.length })}
        />
        <MetricCard
          label={t('classDetail.openNow')}
          value={open.length}
          icon="sensors"
          tone="teal"
          live={open.length > 0}
          caption={
            open[0]
              ? t('classDetail.openCaption', { name: open[0].name, count: open[0].attendanceCount })
              : t('dashboard.nothingOpen')
          }
        />
        <MetricCard label={t('common.checkIns')} value={checkIns} icon="how_to_reg" tone="teal" caption={t('classDetail.allSessions')} />
        <MetricCard
          label={t('classDetail.avg')}
          value={average ?? '—'}
          icon="trending_up"
          tone="neutral"
          caption={average === null ? t('classDetail.avgEmpty') : t('classDetail.avgCaption')}
        />
      </section>

      <ClassAttendanceSection classId={item.id} />

      <section>
        <SectionTitle>{t('classDetail.history')}</SectionTitle>
        <SessionsTable
          rows={item.sessions}
          showClass={false}
          empty={t('classDetail.emptyHistory')}
        />
      </section>

      <ClassSettings classId={item.id} />
    </div>
  );
}

function ClassSessionActions({ classId, latestSessionId }: { classId: string; latestSessionId?: string }) {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const duplicate = useMutation({
    mutationFn: () => api.duplicateSession(latestSessionId ?? '', { shiftDays: 7 }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['class', classId] });
      navigate(`/sessions/${created.id}`);
    },
  });

  return (
    <div className="flex flex-wrap gap-2">
      {latestSessionId && (
        <Button type="button" variant="secondary" onClick={() => duplicate.mutate()} disabled={duplicate.isPending}>
          <Icon name="event_repeat" className="text-[18px]" />
          {t('classDetail.nextWeek')}
        </Button>
      )}
      <Link to={`/classes/${classId}/sessions/new`} className={buttonClass()}>
        <Icon name="play_circle" className="text-[18px]" />
        {t('classes.newSession')}
      </Link>
      {duplicate.error ? <ErrorBlock error={duplicate.error} /> : null}
    </div>
  );
}

function ClassSettings({ classId }: { classId: string }) {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const course = useQuery({ queryKey: ['class', classId], queryFn: () => api.class(classId) });
  const update = useMutation({
    mutationFn: (body: Parameters<typeof api.updateClass>[1]) => api.updateClass(classId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['class', classId] });
      await queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });

  if (!course.data) return null;
  const item = course.data;
  const archiving = item.status === 'ACTIVE';

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-2">
        <SectionTitle>{t('classDetail.settings')}</SectionTitle>
        <ClassForm
          key={`${item.updatedAt}`}
          initial={item}
          submitLabel={t('classDetail.save')}
          pending={update.isPending}
          error={update.error}
          onSubmit={(values) => update.mutate(values)}
        />
      </Card>
      <Card className="h-fit p-5">
        <div className={`mb-3 grid h-10 w-10 place-items-center rounded-lg ${archiving ? 'bg-amber-soft text-amber' : 'bg-good-soft text-good'}`}>
          <Icon name={archiving ? 'inventory_2' : 'unarchive'} className="text-[20px]" />
        </div>
        <h3 className="font-display text-base font-semibold tracking-tight">
          {archiving ? t('classDetail.archiveTitle') : t('classDetail.restoreTitle')}
        </h3>
        <p className="mt-1 text-sm text-muted">
          {archiving ? t('classDetail.archiveBody') : t('classDetail.restoreBody')}
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 w-full"
          disabled={update.isPending}
          onClick={() => {
            const next = archiving ? 'ARCHIVED' : 'ACTIVE';
            update.mutate(
              { status: next },
              {
                onSuccess: () => {
                  if (next === 'ARCHIVED') navigate('/classes');
                },
              },
            );
          }}
        >
          {archiving ? t('classDetail.archive') : t('classDetail.restore')}
        </Button>
      </Card>
    </section>
  );
}
