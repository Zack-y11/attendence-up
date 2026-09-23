import { CLASS_STATUS_LABELS } from '@attendence-up/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { useApi } from '../api/context';
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
import { formatWhen } from '../lib/datetime';

export function ClassDetailPage() {
  const { id = '' } = useParams();
  const api = useApi();
  const course = useQuery({ queryKey: ['class', id], queryFn: () => api.class(id) });

  if (course.isLoading) return <LoadingBlock label="Loading class" />;
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
                Classes
              </Link>
              <Icon name="chevron_right" className="text-[14px] text-muted" />
              <StatusPill tone={item.status === 'ACTIVE' ? 'good' : 'closed'}>
                {CLASS_STATUS_LABELS[item.status]}
              </StatusPill>
            </span>
          }
          title={item.name}
          description={item.description || 'No description yet.'}
          action={
            item.status === 'ACTIVE' ? (
              <Link to={`/classes/${item.id}/sessions/new`} className={buttonClass()}>
                <Icon name="play_circle" className="text-[18px]" />
                New session
              </Link>
            ) : null
          }
        />
        <div className="-mt-3 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 font-medium text-muted">
            <Icon name={item.location ? 'my_location' : 'location_off'} className="text-[14px]" />
            {item.location
              ? `${item.location.latitude.toFixed(5)}, ${item.location.longitude.toFixed(5)} · ${item.location.radiusMeters} m`
              : 'No default location'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 font-medium text-muted">
            <Icon name="calendar_today" className="text-[14px]" />
            Created {formatWhen(item.createdAt)}
          </span>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Sessions" value={item.sessions.length} icon="event_note" caption={`${closed.length} closed`} />
        <MetricCard
          label="Open now"
          value={open.length}
          icon="sensors"
          tone="teal"
          live={open.length > 0}
          caption={open[0] ? `${open[0].name} · ${open[0].attendanceCount} in` : 'Nothing open'}
        />
        <MetricCard label="Check-ins" value={checkIns} icon="how_to_reg" tone="teal" caption="All sessions" />
        <MetricCard
          label="Avg per session"
          value={average ?? '—'}
          icon="trending_up"
          tone="neutral"
          caption={average === null ? 'After the first closed session' : 'Closed sessions only'}
        />
      </section>

      <section>
        <SectionTitle>Session history</SectionTitle>
        <SessionsTable
          rows={item.sessions}
          showClass={false}
          empty="No sessions yet. Each date you meet should be its own session."
        />
      </section>

      <ClassSettings classId={item.id} />
    </div>
  );
}

function ClassSettings({ classId }: { classId: string }) {
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
        <SectionTitle>Class settings</SectionTitle>
        <ClassForm
          key={`${item.updatedAt}`}
          initial={item}
          submitLabel="Save changes"
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
          {archiving ? 'Archive this class' : 'Restore this class'}
        </h3>
        <p className="mt-1 text-sm text-muted">
          {archiving
            ? 'Archived classes keep their history but stop appearing in your active list.'
            : 'Bring the class back to your active list so you can run new sessions.'}
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
          {archiving ? 'Archive class' : 'Restore class'}
        </Button>
      </Card>
    </section>
  );
}
