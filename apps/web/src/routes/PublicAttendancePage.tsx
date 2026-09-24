import {
  absenceNoteForCheckIn,
  deriveLocationStatus,
  submitAttendanceSchema,
  type LocationStatus,
} from '@attendence-up/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { ApiError, fetchPublicSession, submitPublicAttendance } from '../api/client';
import { SignaturePad } from '../components/SignaturePad';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { Button, ErrorBlock, Field, LoadingBlock, inputClass } from '../components/ui';
import { formatWhen } from '../lib/datetime';

type Reading = {
  latitude: number;
  longitude: number;
  locationAccuracyMeters: number;
};

type LocationState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'ready'; reading: Reading }
  | { status: 'unavailable' };

function requestPosition(): Promise<Reading | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationAccuracyMeters: position.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}

export function PublicAttendancePage() {
  const { t } = useTranslation();
  const { token = '' } = useParams();
  const session = useQuery({
    queryKey: ['public-session', token],
    queryFn: () => fetchPublicSession(token),
  });
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [absenceNote, setAbsenceNote] = useState('');
  const [notInClassroom, setNotInClassroom] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<LocationState>({ status: 'idle' });
  const [done, setDone] = useState<{ studentName: string; explained: boolean } | null>(null);
  const suggestedAway = useRef(false);
  const away =
    previewLocationStatus(session.data?.location ?? null, locationState) === 'OUTSIDE_RADIUS';

  useEffect(() => {
    if (!away || suggestedAway.current) return;
    suggestedAway.current = true;
    setNotInClassroom(true);
  }, [away]);

  useEffect(() => {
    if (!session.data?.requestsLocation) return;
    let cancelled = false;
    setLocationState({ status: 'pending' });
    void requestPosition().then((reading) => {
      if (cancelled) return;
      setLocationState(reading ? { status: 'ready', reading } : { status: 'unavailable' });
    });
    return () => {
      cancelled = true;
    };
  }, [session.data?.requestsLocation]);

  const submit = useMutation({
    mutationFn: () => {
      const reading = locationState.status === 'ready' ? locationState.reading : null;
      const absence = absenceNoteForCheckIn(notInClassroom, absenceNote);
      if (!absence.ok) {
        throw new ApiError(400, absence.message, 'ABSENCE_NOTE_REQUIRED');
      }
      const parsed = submitAttendanceSchema.safeParse({
        studentCode: code,
        studentName: name,
        signature,
        latitude: reading?.latitude ?? null,
        longitude: reading?.longitude ?? null,
        locationAccuracyMeters: reading?.locationAccuracyMeters ?? null,
        absenceNote: absence.note,
        notInClassroom,
      });
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.issues[0]?.message ?? t('errors.checkForm'));
      }
      return submitPublicAttendance(token, parsed.data);
    },
    onSuccess: (result) => setDone({ studentName: result.studentName, explained: notInClassroom }),
  });

  if (session.isLoading) {
    return (
      <Shell>
        <LoadingBlock label={t('public.loading')} />
      </Shell>
    );
  }
  if (session.isError) {
    return (
      <Shell>
        <ErrorBlock error={session.error} />
      </Shell>
    );
  }
  if (!session.data) return null;
  const item = session.data;

  return (
    <Shell>
      <div className="rounded-lg bg-mist px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">{t('public.eyebrow')}</p>
            <h1 className="truncate font-display text-lg font-semibold tracking-tight">{item.name}</h1>
          </div>
          <StatusDot open={item.acceptingAttendance} />
        </div>
        <div className="mt-2 space-y-1 text-sm text-muted">
          {item.className && <p className="font-medium text-ink">{item.className}</p>}
          {item.description && <p>{item.description}</p>}
          {(item.startsAt || item.attendanceClosesAt) && (
            <p>
              {item.startsAt ? t('public.meets', { when: formatWhen(item.startsAt) }) : ''}
              {item.attendanceClosesAt ? ` · ${t('public.closes', { when: formatWhen(item.attendanceClosesAt) })}` : ''}
            </p>
          )}
        </div>
      </div>
      {done ? (
        <div className="rounded-lg bg-good-soft px-4 py-5">
          <p className="font-display text-xl font-semibold tracking-tight">
            {t('public.registered', { name: done.studentName })}
          </p>
          <p className="mt-1 text-sm text-muted">{t('public.confirmedPresent')}</p>
          {done.explained ? <p className="mt-1 text-sm text-muted">{t('public.reasonSent')}</p> : null}
          <p className="mt-1 text-sm text-muted">{t('public.closePage')}</p>
        </div>
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setFieldError(null);
            submit.mutate();
          }}
        >
          {!item.acceptingAttendance && (
            <p className="rounded-lg bg-amber-soft px-3 py-2 text-sm text-amber">
              {closedMessage(item.closedReason, item.status, t)}
            </p>
          )}
          {item.requestsLocation && (
            <LocationCard
              state={locationState}
              onRetry={() => {
                setLocationState({ status: 'pending' });
                void requestPosition().then((reading) =>
                  setLocationState(reading ? { status: 'ready', reading } : { status: 'unavailable' }),
                );
              }}
            />
          )}
          <Field label={t('public.code')}>
            <input
              className={inputClass}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              required
            />
          </Field>
          <Field label={t('public.name')}>
            <input
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </Field>
          <SignaturePad suggestedName={name} onChange={setSignature} />
          <div className="rounded-lg bg-mist px-3.5 py-3">
            <label className="flex items-start gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={notInClassroom}
                onChange={(event) => setNotInClassroom(event.target.checked)}
              />
              {t('public.awayToggle')}
            </label>
            <p className="mt-1 text-sm text-muted">{t('public.awayToggleHint')}</p>
            {notInClassroom && (
              <div className="mt-3">
                <button
                  type="button"
                  className="mb-2 rounded-full bg-card px-3 py-1 text-xs font-semibold text-ink hover:bg-line"
                  onClick={() => setAbsenceNote((current) => (current.trim() ? current : t('public.awayWork')))}
                >
                  {t('public.awayWorkChip')}
                </button>
                <Field label={t('public.awayLabel')} hint={t('public.awayRequiredHint')}>
                  <textarea
                    className="min-h-24 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-[#94a3b8] focus:border-accent focus:ring-[3px] focus:ring-accent/15"
                    value={absenceNote}
                    onChange={(event) => setAbsenceNote(event.target.value)}
                    placeholder={t('public.awayPlaceholder')}
                    required
                    maxLength={500}
                  />
                </Field>
              </div>
            )}
          </div>
          {(fieldError || submit.error) && <ErrorBlock error={fieldError ?? submit.error} />}
          <Button type="submit" className="w-full" disabled={!item.acceptingAttendance || submit.isPending}>
            {submit.isPending ? t('common.registering') : t('public.submit')}
          </Button>
        </form>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-paper px-4 py-10">
      <div className="pointer-events-none absolute -top-16 left-1/4 h-44 w-44 rounded-full bg-accent-soft opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-48 w-48 rounded-full bg-[#e2e7ff] opacity-60 blur-3xl" />
      <div className="relative w-full max-w-md rounded-xl bg-card p-5 shadow-[0_20px_25px_-5px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="" className="h-8 w-8" />
            <div>
              <p className="font-display text-sm font-semibold tracking-tight">Attendence-Up</p>
              <p className="text-xs text-muted">{t('public.subtitle')}</p>
            </div>
          </div>
          <LanguageSwitch />
        </div>
        <div className="grid gap-5">{children}</div>
      </div>
    </div>
  );
}

function StatusDot({ open }: { open: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-semibold ${
        open ? 'bg-good-soft text-good' : 'bg-mist text-muted'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${open ? 'animate-pulse bg-good' : 'bg-muted'}`} />
      {open ? t('status.session.OPEN') : t('status.session.CLOSED')}
    </span>
  );
}

function LocationCard({ state, onRetry }: { state: LocationState; onRetry: () => void }) {
  const { t } = useTranslation();
  const ready = state.status === 'ready';
  const unavailable = state.status === 'unavailable';
  return (
    <div className={`rounded-lg px-3.5 py-3 text-sm ${unavailable ? 'bg-[#e2e7ff]' : 'bg-[#eaedff]'}`}>
      <p className="text-xs font-semibold tracking-wider text-muted uppercase">{t('public.location')}</p>
      <p className="mt-1 font-medium text-ink">
        {state.status === 'pending' && t('public.requesting')}
        {ready && t('public.detected', { meters: Math.round(state.reading.locationAccuracyMeters) })}
        {unavailable && t('public.unavailable')}
        {state.status === 'idle' && t('public.waiting')}
      </p>
      <p className="mt-1 text-muted">{t('public.locationBody')}</p>
      {unavailable && (
        <button type="button" className="mt-2 text-sm font-medium text-accent underline" onClick={onRetry}>
          {t('common.tryAgain')}
        </button>
      )}
    </div>
  );
}

function previewLocationStatus(
  location: { latitude: number; longitude: number; radiusMeters: number } | null,
  state: LocationState,
): LocationStatus {
  if (!location) return 'NO_EXPECTED_LOCATION';
  if (state.status !== 'ready') return 'LOCATION_UNAVAILABLE';
  return deriveLocationStatus(
    {
      latitude: state.reading.latitude,
      longitude: state.reading.longitude,
      accuracyMeters: state.reading.locationAccuracyMeters,
    },
    location,
  ).status;
}

function closedMessage(reason: string | null, status: string, t: (key: string) => string): string {
  if (reason === 'TOO_EARLY') return t('public.notOpenYet');
  if (reason === 'TOO_LATE') return t('public.windowClosed');
  if (status === 'CLOSED') return t('public.closed');
  return t('public.notOpened');
}
