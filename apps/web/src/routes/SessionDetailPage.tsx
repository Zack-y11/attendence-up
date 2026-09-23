import {
  LOCATION_STATUS_LABELS,
  SESSION_STATUS_LABELS,
  formatAccuracy,
  formatDistance,
  type AttendanceRecordDto,
  type LocationStatus,
} from '@attendence-up/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useApi } from '../api/context';
import { AttendanceQr } from '../components/AttendanceQr';
import { ExportDialog } from '../components/ExportDialog';
import { SessionForm } from '../components/SessionForm';
import {
  Avatar,
  Button,
  Card,
  ErrorBlock,
  Icon,
  LiveDot,
  LoadingBlock,
  SearchInput,
  SectionTitle,
  SegmentedTabs,
  StatusPill,
  sessionTone,
  tableHeadClass,
  tdClass,
  thClass,
  trClass,
} from '../components/ui';
import { rotationDelayMs, useSecondsUntilRotation } from '../lib/checkInRotation';
import { formatTime, formatWhen } from '../lib/datetime';
import { publicAttendanceUrl } from '../lib/publicAttendanceUrl';
import { useCopy } from '../lib/useCopy';

type RosterFilter = 'ALL' | 'NEAR' | 'FLAGGED' | 'NO_LOCATION';

const FLAGGED: LocationStatus[] = ['OUTSIDE_RADIUS', 'LOW_ACCURACY'];
const NO_LOCATION: LocationStatus[] = ['LOCATION_UNAVAILABLE', 'NO_EXPECTED_LOCATION'];

function matches(record: AttendanceRecordDto, filter: RosterFilter) {
  if (filter === 'NEAR') return record.locationStatus === 'WITHIN_RADIUS';
  if (filter === 'FLAGGED') return FLAGGED.includes(record.locationStatus);
  if (filter === 'NO_LOCATION') return NO_LOCATION.includes(record.locationStatus);
  return true;
}

export function SessionDetailPage() {
  const { id = '' } = useParams();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { copied, error: copyError, copy } = useCopy();
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filter, setFilter] = useState<RosterFilter>('ALL');
  const [search, setSearch] = useState('');

  const session = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.session(id),
    refetchInterval: (query) => (query.state.data?.status === 'OPEN' ? 4000 : false),
  });
  const attendance = useQuery({
    queryKey: ['attendance', id],
    queryFn: () => api.attendance(id),
    enabled: session.isSuccess,
    refetchInterval: session.data?.status === 'OPEN' ? 4000 : false,
  });
  const sessionIsOpen = session.data?.status === 'OPEN';
  const checkIn = useQuery({
    queryKey: ['check-in-code', id],
    queryFn: () => api.checkInCode(id),
    enabled: sessionIsOpen,
    refetchInterval: (query) => (sessionIsOpen ? rotationDelayMs(query.state.data?.rotatesAt) : false),
  });
  const refreshCheckIn = useMutation({
    mutationFn: () => api.refreshCheckInCode(id),
    onSuccess: (data) => queryClient.setQueryData(['check-in-code', id], data),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['session', id] });
    await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    await queryClient.invalidateQueries({ queryKey: ['attendance', id] });
    await queryClient.invalidateQueries({ queryKey: ['check-in-code', id] });
    if (session.data?.classId) {
      await queryClient.invalidateQueries({ queryKey: ['class', session.data.classId] });
    }
  };

  const open = useMutation({ mutationFn: () => api.openSession(id), onSuccess: invalidate });
  const close = useMutation({ mutationFn: () => api.closeSession(id), onSuccess: invalidate });
  const reopen = useMutation({ mutationFn: () => api.reopenSession(id), onSuccess: invalidate });
  const remove = useMutation({
    mutationFn: () => api.deleteSession(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      navigate('/sessions');
    },
  });
  const update = useMutation({
    mutationFn: (body: Parameters<typeof api.updateSession>[1]) => api.updateSession(id, body),
    onSuccess: invalidate,
  });
  const duplicate = useMutation({
    mutationFn: (shiftDays: number) => api.duplicateSession(id, { shiftDays }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      if (session.data?.classId) {
        await queryClient.invalidateQueries({ queryKey: ['class', session.data.classId] });
      }
      navigate(`/sessions/${created.id}`);
    },
  });

  if (session.isLoading) return <LoadingBlock label="Loading session" />;
  if (session.isError) return <ErrorBlock error={session.error} />;
  if (!session.data) return null;
  const item = session.data;
  const isOpen = item.status === 'OPEN';
  const checkInPath = isOpen ? checkIn.data?.publicPath : item.publicPath;
  const link = checkInPath ? publicAttendanceUrl(window.location.origin, checkInPath) : '';
  const actionError = open.error || close.error || reopen.error || remove.error || duplicate.error;

  const records = attendance.data ?? [];
  const near = records.filter((record) => matches(record, 'NEAR')).length;
  const flagged = records.filter((record) => matches(record, 'FLAGGED')).length;
  const noLocation = records.filter((record) => matches(record, 'NO_LOCATION')).length;
  const query = search.trim().toLowerCase();
  const visible = records.filter(
    (record) =>
      matches(record, filter) &&
      (!query ||
        record.studentName.toLowerCase().includes(query) ||
        record.studentCode.toLowerCase().includes(query)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to={item.classId ? `/classes/${item.classId}` : '/sessions'}
          className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-accent"
        >
          <Icon name="arrow_back" className="text-[16px]" />
          {item.className ?? 'Sessions'}
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {isOpen ? (
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-teal-soft px-2 text-xs font-semibold text-teal">
                  <LiveDot className="h-2 w-2" />
                  Live session
                </span>
              ) : (
                <StatusPill tone={sessionTone(item.status)}>{SESSION_STATUS_LABELS[item.status]}</StatusPill>
              )}
              <span className="text-xs font-semibold tracking-wider text-muted uppercase">
                {item.className ?? 'Standalone session'}
              </span>
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[2rem] sm:leading-10">
              {item.name}
            </h1>
            {item.description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{item.description}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => duplicate.mutate(0)} disabled={duplicate.isPending}>
              <Icon name="content_copy" className="text-[18px]" />
              Duplicate
            </Button>
            <Button type="button" variant="secondary" onClick={() => duplicate.mutate(7)} disabled={duplicate.isPending}>
              <Icon name="event_repeat" className="text-[18px]" />
              Next week
            </Button>
            <Button type="button" variant="secondary" onClick={() => setExportOpen(true)}>
              <Icon name="download" className="text-[18px]" />
              Export
            </Button>
            {item.status === 'DRAFT' && item.attendanceCount === 0 && (
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}>
                <Icon name="delete" className="text-[18px]" />
                Delete draft
              </Button>
            )}
            {item.status === 'DRAFT' && (
              <Button type="button" onClick={() => open.mutate()} disabled={open.isPending}>
                <Icon name="play_arrow" className="text-[18px]" />
                Open attendance
              </Button>
            )}
            {isOpen && (
              <Button type="button" variant="danger" onClick={() => close.mutate()} disabled={close.isPending}>
                <Icon name="stop_circle" className="text-[18px]" />
                Close attendance
              </Button>
            )}
            {item.status === 'CLOSED' && (
              <Button type="button" onClick={() => reopen.mutate()} disabled={reopen.isPending}>
                <Icon name="replay" className="text-[18px]" />
                Reopen attendance
              </Button>
            )}
          </div>
        </div>
      </div>

      {actionError ? <ErrorBlock error={actionError} /> : null}
      {confirmDelete && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm">
          <Icon name="warning" className="text-[18px] text-danger" />
          <span className="flex-1">Delete this draft session? This cannot be undone.</span>
          <Button type="button" variant="danger" onClick={() => remove.mutate()} disabled={remove.isPending}>
            Delete
          </Button>
          <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
            Keep
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="p-5 lg:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted uppercase">Public attendance link</p>
              <p className="mt-0.5 text-sm text-muted">
                {isOpen
                  ? 'Students scan the QR code. It changes on a short timer, and a code that just left the screen still checks in briefly.'
                  : 'Students cannot check in until the session is open.'}
              </p>
            </div>
            <span className={`grid h-9 w-9 place-items-center rounded-lg ${isOpen ? 'bg-teal-soft text-teal' : 'bg-mist text-muted'}`}>
              <Icon name={isOpen ? 'wifi_tethering' : 'wifi_tethering_off'} className="text-[20px]" />
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            {isOpen && checkIn.data && <AttendanceQr url={link} />}
            {isOpen && !checkIn.data && (
              <div className="grid h-48 w-44 shrink-0 place-items-center rounded-lg border border-line bg-white text-xs text-muted">
                {checkIn.isError ? 'QR unavailable' : 'Preparing QR…'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2.5">
                <Icon name="link" className="text-[18px] text-muted" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs">
                  {isOpen && checkIn.isError ? 'Check-in link unavailable' : link || 'Preparing the current check-in link…'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant={copyError ? 'danger' : 'primary'} disabled={!link} onClick={() => void copy(link)}>
                  <Icon name={copied ? 'check' : copyError ? 'error' : 'content_copy'} className="text-[18px]" />
                  {copied ? 'Copied' : copyError ? 'Copy failed' : 'Copy link'}
                </Button>
                {isOpen && (
                  <Button type="button" variant="secondary" onClick={() => refreshCheckIn.mutate()} disabled={refreshCheckIn.isPending}>
                    <Icon name="refresh" className="text-[18px]" />
                    {refreshCheckIn.isPending ? 'Refreshing…' : 'New code'}
                  </Button>
                )}
                {copyError ? <p className="w-full text-sm text-danger">{copyError}</p> : null}
                {link ? (
                  <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3.5 py-2 text-sm font-medium hover:bg-mist">
                    <Icon name="open_in_new" className="text-[18px]" />
                    Open check-in page
                  </a>
                ) : null}
                {isOpen && checkIn.data && (
                  <QrRefreshNote
                    rotatesAt={checkIn.data.rotatesAt}
                    refreshSeconds={checkIn.data.refreshSeconds}
                    graceSeconds={checkIn.data.graceSeconds}
                  />
                )}
              </div>
              {checkIn.isError ? (
                <div className="mt-3">
                  <ErrorBlock error={checkIn.error} />
                </div>
              ) : null}
              {refreshCheckIn.isError ? (
                <div className="mt-3">
                  <ErrorBlock error={refreshCheckIn.error} />
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">Check-in telemetry</p>
            {isOpen && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal">
                <LiveDot className="h-2 w-2" />
                Updating
              </span>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-[2.5rem] leading-none font-semibold tracking-tight">
              {item.attendanceCount}
            </span>
            <span className="text-sm text-muted">check-ins</span>
          </div>
          <TelemetryBar near={near} flagged={flagged} noLocation={noLocation} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <Legend color="bg-teal" label="Near" value={near} />
            <Legend color="bg-amber" label="Flagged" value={flagged} />
            <Legend color="bg-line-strong" label="No location" value={noLocation} />
          </div>
        </Card>
      </div>

      <Card className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <Detail icon="event" label="Starts" value={formatWhen(item.startsAt)} />
        <Detail icon="event_busy" label="Ends" value={formatWhen(item.endsAt)} />
        <Detail icon="login" label="Check-in opens" value={formatWhen(item.attendanceOpensAt)} />
        <Detail icon="logout" label="Check-in closes" value={formatWhen(item.attendanceClosesAt)} />
        <Detail
          icon={item.location ? 'my_location' : 'location_off'}
          label="Classroom"
          value={item.location ? `${item.location.radiusMeters} m radius` : 'Not configured'}
          sub={item.location ? `${item.location.latitude.toFixed(5)}, ${item.location.longitude.toFixed(5)}` : undefined}
        />
      </Card>

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">Check-in roster</h2>
            <p className="text-sm text-muted">
              {isOpen ? 'New check-ins appear every few seconds while the session is open.' : 'Everyone who checked in to this session.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SegmentedTabs
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'ALL', label: 'All', count: records.length },
                { value: 'NEAR', label: 'Near', count: near },
                { value: 'FLAGGED', label: 'Flagged', count: flagged, tone: 'warn' },
                { value: 'NO_LOCATION', label: 'No location', count: noLocation },
              ]}
            />
            <SearchInput value={search} onChange={setSearch} placeholder="Search name or code…" />
          </div>
        </div>
        {attendance.isLoading && <LoadingBlock label="Loading attendance" />}
        {attendance.isError && <ErrorBlock error={attendance.error} />}
        {attendance.data && (
          <Card className="overflow-hidden">
            {visible.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted">
                <Icon name="group_off" className="mb-1 block text-[22px]" />
                {records.length === 0 ? 'No one has checked in yet.' : 'No check-ins match this filter.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className={thClass}>Time</th>
                      <th className={thClass}>Student</th>
                      <th className={thClass}>Distance</th>
                      <th className={thClass}>Precision</th>
                      <th className={thClass}>Location status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((record) => (
                      <tr key={record.id} className={trClass}>
                        <td className={`${tdClass} whitespace-nowrap text-xs text-muted tabular-nums`}>
                          {formatTime(record.createdAt)}
                        </td>
                        <td className={tdClass}>
                          <div className="flex items-center gap-3">
                            <Avatar name={record.studentName} />
                            <div className="min-w-0">
                              <span className="block font-semibold">{record.studentName}</span>
                              <span className="block text-xs text-muted tabular-nums">
                                #{record.studentCode}
                                {record.signature ? ` · Signed “${record.signature}”` : ''}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className={`${tdClass} whitespace-nowrap`}>
                          <DistanceCell record={record} />
                        </td>
                        <td className={`${tdClass} whitespace-nowrap text-xs tabular-nums`}>
                          {formatAccuracy(record.locationAccuracyMeters) ? (
                            <span className="font-medium">GPS {formatAccuracy(record.locationAccuracyMeters)}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className={tdClass}>
                          <StatusPill tone={toneFor(record.locationStatus)}>
                            {LOCATION_STATUS_LABELS[record.locationStatus]}
                          </StatusPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {records.length > 0 && (
              <div className="border-t border-line bg-paper px-4 py-2.5 text-xs text-muted">
                Showing {visible.length} of {records.length} check-ins
              </div>
            )}
          </Card>
        )}
      </section>

      {item.status !== 'CLOSED' && (
        <Card className="p-5">
          <SectionTitle>Session settings</SectionTitle>
          <SessionForm
            key={item.updatedAt}
            initial={item}
            submitLabel="Save changes"
            pending={update.isPending}
            error={update.error}
            onSubmit={(values) => update.mutate(values)}
          />
        </Card>
      )}
      {exportOpen && <ExportDialog sessionId={item.id} onClose={() => setExportOpen(false)} />}
    </div>
  );
}

function TelemetryBar({ near, flagged, noLocation }: { near: number; flagged: number; noLocation: number }) {
  const total = near + flagged + noLocation;
  if (total === 0) return <div className="mt-4 h-2 rounded-full bg-mist" />;
  const pct = (value: number) => `${(value / total) * 100}%`;
  return (
    <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-mist">
      <span className="bg-teal" style={{ width: pct(near) }} />
      <span className="bg-amber" style={{ width: pct(flagged) }} />
      <span className="bg-line-strong" style={{ width: pct(noLocation) }} />
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-paper px-2.5 py-2">
      <span className="flex items-center gap-1.5 text-muted">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        {label}
      </span>
      <span className="mt-0.5 block text-base font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Detail({ icon, label, value, sub }: { icon: string; label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-mist text-muted">
        <Icon name={icon} className="text-[18px]" />
      </span>
      <div className="min-w-0">
        <span className="block text-xs font-semibold tracking-wider text-muted uppercase">{label}</span>
        <span className="block truncate text-sm font-medium">{value}</span>
        {sub && <span className="block truncate font-mono text-[11px] text-muted">{sub}</span>}
      </div>
    </div>
  );
}

function DistanceCell({ record }: { record: AttendanceRecordDto }) {
  const distance = formatDistance(record.distanceFromSessionMeters);
  if (!distance) return <span className="text-xs text-muted">—</span>;
  if (record.locationStatus === 'WITHIN_RADIUS') {
    return (
      <StatusPill tone="live" icon="check_circle">
        {distance}
      </StatusPill>
    );
  }
  if (FLAGGED.includes(record.locationStatus)) {
    return (
      <StatusPill tone="warn" icon="warning">
        {distance}
      </StatusPill>
    );
  }
  return <span className="text-xs font-medium tabular-nums">{distance}</span>;
}

function toneFor(status: LocationStatus): 'live' | 'warn' | 'neutral' {
  if (status === 'WITHIN_RADIUS') return 'live';
  if (FLAGGED.includes(status)) return 'warn';
  return 'neutral';
}

function QrRefreshNote({
  rotatesAt,
  refreshSeconds,
  graceSeconds,
}: {
  rotatesAt: string;
  refreshSeconds: number;
  graceSeconds: number;
}) {
  const seconds = useSecondsUntilRotation(rotatesAt);
  return (
    <p className="w-full text-xs text-muted">
      {seconds != null && seconds > 0 ? `QR refreshes in ${seconds}s.` : 'Refreshing the QR code…'} It changes every{' '}
      {refreshSeconds} seconds. A code that just left the screen keeps working for {graceSeconds} seconds.
    </p>
  );
}
