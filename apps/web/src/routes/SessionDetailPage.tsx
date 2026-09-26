import {
  formatAccuracy,
  formatDistance,
  isSignatureImage,
  type AttendanceRecordDto,
  type AttendanceStatus,
  type LocationStatus,
} from '@attendence-up/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatClock, formatTime, formatWhen } from '../lib/datetime';
import { paths } from '../lib/paths';
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
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { copied, error: copyError, copy } = useCopy();
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filter, setFilter] = useState<RosterFilter>('ALL');
  const [search, setSearch] = useState('');
  const [pinnedStatus, setPinnedStatus] = useState<ReadonlyMap<string, AttendanceStatus>>(new Map());
  const [savingStatusIds, setSavingStatusIds] = useState<ReadonlySet<string>>(new Set());

  const session = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const item = await api.session(id);
      if (item.status !== 'OPEN') {
        await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      }
      return item;
    },
    refetchInterval: (query) => (query.state.data?.status === 'OPEN' ? 4000 : false),
  });
  const attendance = useQuery({
    queryKey: ['attendance', id],
    queryFn: () => api.attendance(id),
    enabled: session.isSuccess,
    refetchInterval: session.data?.status === 'OPEN' ? 4000 : false,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['session', id] });
    await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    await queryClient.invalidateQueries({ queryKey: ['attendance', id] });
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
      navigate(paths.session(created.id));
    },
  });
  const setStatus = useMutation({
    mutationFn: (input: { recordId: string; attendanceStatus: AttendanceStatus }) =>
      api.updateAttendanceStatus(id, input.recordId, input.attendanceStatus),
    onSuccess: (updated) => {
      queryClient.setQueryData<AttendanceRecordDto[]>(['attendance', id], (current) =>
        current?.map((record) => (record.id === updated.id ? updated : record)),
      );
    },
  });

  function saveStatus(recordId: string, attendanceStatus: AttendanceStatus) {
    setPinnedStatus((current) => new Map(current).set(recordId, attendanceStatus));
    setSavingStatusIds((current) => new Set(current).add(recordId));
    setStatus.mutate(
      { recordId, attendanceStatus },
      {
        onError: () => {
          setPinnedStatus((current) => {
            if (current.get(recordId) !== attendanceStatus) return current;
            const next = new Map(current);
            next.delete(recordId);
            return next;
          });
        },
        onSettled: () => {
          setSavingStatusIds((current) => {
            const next = new Set(current);
            next.delete(recordId);
            return next;
          });
        },
      },
    );
  }

  if (session.isLoading) return <LoadingBlock label={t('session.loading')} />;
  if (session.isError) return <ErrorBlock error={session.error} />;
  if (!session.data) return null;
  const item = session.data;
  const isOpen = item.status === 'OPEN';
  const link = publicAttendanceUrl(window.location.origin, item.publicPath);
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
        record.studentCode.toLowerCase().includes(query) ||
        (record.absenceNote?.toLowerCase().includes(query) ?? false)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to={item.classId ? paths.class(item.classId) : paths.sessions}
          className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-accent"
        >
          <Icon name="arrow_back" className="text-[16px]" />
          {item.className ?? t('nav.sessions')}
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {isOpen ? (
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-teal-soft px-2 text-xs font-semibold text-teal">
                  <LiveDot className="h-2 w-2" />
                  {t('session.live')}
                </span>
              ) : (
                <StatusPill tone={sessionTone(item.status)}>{t(`status.session.${item.status}`)}</StatusPill>
              )}
              <span className="text-xs font-semibold tracking-wider text-muted uppercase">
                {item.className ?? t('session.standalone')}
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
              {t('session.duplicate')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => duplicate.mutate(7)} disabled={duplicate.isPending}>
              <Icon name="event_repeat" className="text-[18px]" />
              {t('session.nextWeek')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setExportOpen(true)}>
              <Icon name="download" className="text-[18px]" />
              {t('session.export')}
            </Button>
            {item.status === 'DRAFT' && item.attendanceCount === 0 && (
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}>
                <Icon name="delete" className="text-[18px]" />
                {t('session.deleteDraft')}
              </Button>
            )}
            {item.status === 'DRAFT' && (
              <Button type="button" onClick={() => open.mutate()} disabled={open.isPending}>
                <Icon name="play_arrow" className="text-[18px]" />
                {t('session.open')}
              </Button>
            )}
            {isOpen && (
              <Button type="button" variant="danger" onClick={() => close.mutate()} disabled={close.isPending}>
                <Icon name="stop_circle" className="text-[18px]" />
                {t('session.close')}
              </Button>
            )}
            {item.status === 'CLOSED' && (
              <Button type="button" onClick={() => reopen.mutate()} disabled={reopen.isPending}>
                <Icon name="replay" className="text-[18px]" />
                {t('session.reopen')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {actionError ? <ErrorBlock error={actionError} /> : null}
      {confirmDelete && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm">
          <Icon name="warning" className="text-[18px] text-danger" />
          <span className="flex-1">{t('session.confirmDelete')}</span>
          <Button type="button" variant="danger" onClick={() => remove.mutate()} disabled={remove.isPending}>
            {t('common.delete')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
            {t('common.keep')}
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="p-5 lg:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-muted uppercase">{t('session.linkTitle')}</p>
              <p className="mt-0.5 text-sm text-muted">
                {isOpen ? t('session.linkOpen') : t('session.linkClosed')}
              </p>
            </div>
            <span className={`grid h-9 w-9 place-items-center rounded-lg ${isOpen ? 'bg-teal-soft text-teal' : 'bg-mist text-muted'}`}>
              <Icon name={isOpen ? 'wifi_tethering' : 'wifi_tethering_off'} className="text-[20px]" />
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            {isOpen && (
              <AttendanceQr url={link} title={t('session.qrTitle')} caption={t('session.qrCaption')} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2.5">
                <Icon name="link" className="text-[18px] text-muted" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{link}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant={copyError ? 'danger' : 'primary'} onClick={() => void copy(link)}>
                  <Icon name={copied ? 'check' : copyError ? 'error' : 'content_copy'} className="text-[18px]" />
                  {copied ? t('common.copied') : copyError ? t('common.copyFailed') : t('common.copyLink')}
                </Button>
                {copyError ? <p className="w-full text-sm text-danger">{t('errors.copyFailed')}</p> : null}
                <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3.5 py-2 text-sm font-medium hover:bg-mist">
                  <Icon name="open_in_new" className="text-[18px]" />
                  {t('session.openPage')}
                </a>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">{t('session.telemetry')}</p>
            {isOpen && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal">
                <LiveDot className="h-2 w-2" />
                {t('session.updating')}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-[2.5rem] leading-none font-semibold tracking-tight">
              {item.attendanceCount}
            </span>
            <span className="text-sm text-muted">{t('session.checkIns')}</span>
          </div>
          <TelemetryBar near={near} flagged={flagged} noLocation={noLocation} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <Legend color="bg-teal" label={t('session.near')} value={near} />
            <Legend color="bg-amber" label={t('session.flagged')} value={flagged} />
            <Legend color="bg-line-strong" label={t('session.noLocation')} value={noLocation} />
          </div>
        </Card>
      </div>

      <Card className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <Detail icon="event" label={t('session.starts')} value={formatClock(item.startsAt)} />
        <Detail icon="event_busy" label={t('session.ends')} value={formatClock(item.endsAt)} />
        <Detail icon="login" label={t('session.opens')} value={formatWhen(item.attendanceOpensAt)} />
        <Detail icon="logout" label={t('session.closes')} value={formatWhen(item.attendanceClosesAt)} />
        <Detail
          icon={item.location ? 'my_location' : 'location_off'}
          label={t('session.classroom')}
          value={item.location ? t('session.radius', { radius: item.location.radiusMeters }) : t('session.notConfigured')}
          sub={item.location ? `${item.location.latitude.toFixed(5)}, ${item.location.longitude.toFixed(5)}` : undefined}
        />
      </Card>

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">{t('session.roster')}</h2>
            <p className="text-sm text-muted">
              {isOpen ? t('session.rosterLive') : t('session.rosterClosed')}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SegmentedTabs
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'ALL', label: t('common.all'), count: records.length },
                { value: 'NEAR', label: t('session.near'), count: near },
                { value: 'FLAGGED', label: t('session.flagged'), count: flagged, tone: 'warn' },
                { value: 'NO_LOCATION', label: t('session.noLocation'), count: noLocation },
              ]}
            />
            <SearchInput value={search} onChange={setSearch} placeholder={t('session.search')} />
          </div>
        </div>
        {attendance.isLoading && <LoadingBlock label={t('session.loadingAttendance')} />}
        {attendance.isError && <ErrorBlock error={attendance.error} />}
        {setStatus.error ? (
          <div className="mb-3">
            <ErrorBlock error={setStatus.error} />
          </div>
        ) : null}
        {attendance.data && (
          <Card className="overflow-hidden">
            {visible.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted">
                <Icon name="group_off" className="mb-1 block text-[22px]" />
                {records.length === 0 ? t('session.empty') : t('session.noMatch')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className={thClass}>{t('session.time')}</th>
                      <th className={thClass}>{t('session.student')}</th>
                      <th className={thClass}>{t('session.attendanceStatus')}</th>
                      <th className={thClass}>{t('session.distance')}</th>
                      <th className={thClass}>{t('session.precision')}</th>
                      <th className={thClass}>{t('session.locationStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((record) => (
                      <tr key={record.id} className={trClass}>
                        <td className={`${tdClass} whitespace-nowrap text-xs text-muted tabular-nums`}>
                          {formatTime(record.createdAt)}
                        </td>
                        <td className="px-4 py-2 align-middle">
                          <div className="flex items-center gap-3">
                            <Avatar name={record.studentName} />
                            <div className="min-w-0">
                              <span className="block font-semibold">{record.studentName}</span>
                              <span className="block text-xs text-muted tabular-nums">
                                #{record.studentCode}
                                {record.signature && !isSignatureImage(record.signature)
                                  ? ` · ${t('session.signed', { name: record.signature })}`
                                  : ''}
                              </span>
                              {record.signature && isSignatureImage(record.signature) && (
                                <img
                                  src={record.signature}
                                  alt={t('session.signatureOf', { name: record.studentName })}
                                  className="mt-1 h-8 max-w-36 object-contain object-left"
                                />
                              )}
                              {record.absenceNote && (
                                <span className="mt-1 block max-w-xs text-xs leading-snug text-ink">
                                  <span className="font-semibold text-muted">{t('session.away')}: </span>
                                  {record.absenceNote}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 align-middle">
                          <AttendanceStatusSelect
                            name={record.studentName}
                            value={pinnedStatus.get(record.id) ?? record.attendanceStatus}
                            disabled={savingStatusIds.has(record.id)}
                            onChange={(attendanceStatus) => saveStatus(record.id, attendanceStatus)}
                          />
                        </td>
                        <td className={`${tdClass} whitespace-nowrap`}>
                          <DistanceCell record={record} />
                        </td>
                        <td className={`${tdClass} whitespace-nowrap text-xs tabular-nums`}>
                          {formatAccuracy(record.locationAccuracyMeters) ? (
                            <span className="font-medium">
                              {t('session.gps', { accuracy: formatAccuracy(record.locationAccuracyMeters) })}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className={tdClass}>
                          <StatusPill tone={toneFor(record.locationStatus)}>
                            {t(`status.location.${record.locationStatus}`)}
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
                {t('session.showing', { visible: visible.length, total: records.length })}
              </div>
            )}
          </Card>
        )}
      </section>

      <Card className="p-5">
        <SectionTitle>{t('session.settings')}</SectionTitle>
        <SessionForm
          key={item.updatedAt}
          initial={item}
          submitLabel={t('session.save')}
          pending={update.isPending}
          error={update.error}
          onSubmit={(values) => update.mutate(values)}
        />
      </Card>
      {exportOpen && (
        <ExportDialog
          sessionId={item.id}
          sessionName={item.name}
          className={item.className}
          attendanceOpensAt={item.attendanceOpensAt}
          records={records}
          onClose={() => setExportOpen(false)}
        />
      )}
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

function AttendanceStatusSelect({
  name,
  value,
  disabled,
  onChange,
}: {
  name: string;
  value: AttendanceStatus;
  disabled: boolean;
  onChange: (status: AttendanceStatus) => void;
}) {
  const { t } = useTranslation();
  return (
    <select
      aria-label={t('session.statusFor', { name })}
      className={`h-8 max-w-40 rounded-lg border px-2 text-xs font-semibold outline-none focus:ring-[3px] focus:ring-accent/15 disabled:cursor-wait disabled:opacity-60 ${attendanceSelectClass(value)}`}
      value={value}
      disabled={disabled}
      onChange={(event) => {
        const next = event.target.value as AttendanceStatus;
        if (next !== value) onChange(next);
      }}
    >
      {(['PRESENT', 'LATE', 'EXCUSED', 'ABSENT'] as const).map((status) => (
        <option key={status} value={status}>
          {t(`status.attendance.${status}`)}
        </option>
      ))}
    </select>
  );
}

function attendanceSelectClass(status: AttendanceStatus): string {
  switch (status) {
    case 'PRESENT':
      return 'border-teal/30 bg-teal-soft text-teal';
    case 'LATE':
      return 'border-amber/30 bg-amber-soft text-amber';
    case 'EXCUSED':
      return 'border-line bg-mist text-ink';
    case 'ABSENT':
      return 'border-danger/20 bg-danger-soft text-danger';
  }
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
