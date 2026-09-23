import { missingCheckInCodeMessage, staleCheckInCodeMessage, submitAttendanceSchema } from '@attendence-up/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { ApiError, fetchPublicSession, submitPublicAttendance } from '../api/client';
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
  const { token = '' } = useParams();
  const [params] = useSearchParams();
  const checkInCode = params.get('c')?.trim() ?? '';
  const session = useQuery({
    queryKey: ['public-session', token, checkInCode],
    queryFn: () => fetchPublicSession(token, checkInCode || undefined),
  });
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [signature, setSignature] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<LocationState>({ status: 'idle' });
  const [done, setDone] = useState<{ studentName: string } | null>(null);

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
      const parsed = submitAttendanceSchema.safeParse({
        studentCode: code,
        studentName: name,
        signature: signature.trim() ? signature : null,
        latitude: reading?.latitude ?? null,
        longitude: reading?.longitude ?? null,
        locationAccuracyMeters: reading?.locationAccuracyMeters ?? null,
        checkInCode: checkInCode || undefined,
      });
      if (!parsed.success) {
        throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Check the form and try again.');
      }
      return submitPublicAttendance(token, parsed.data);
    },
    onSuccess: (result) => setDone({ studentName: result.studentName }),
  });

  if (session.isLoading) {
    return (
      <Shell>
        <LoadingBlock label="Loading attendance" />
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
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">Course session</p>
            <h1 className="truncate font-display text-lg font-semibold tracking-tight">{item.name}</h1>
          </div>
          <StatusDot open={item.acceptingAttendance} />
        </div>
        <div className="mt-2 space-y-1 text-sm text-muted">
          {item.className && <p className="font-medium text-ink">{item.className}</p>}
          {item.description && <p>{item.description}</p>}
          {(item.startsAt || item.attendanceClosesAt) && (
            <p>
              {item.startsAt ? `Class meets ${formatWhen(item.startsAt)}` : ''}
              {item.attendanceClosesAt ? ` · Closes ${formatWhen(item.attendanceClosesAt)}` : ''}
            </p>
          )}
        </div>
      </div>
      {done ? (
        <div className="rounded-lg bg-good-soft px-4 py-5">
          <p className="font-display text-xl font-semibold tracking-tight">You’re registered, {done.studentName}.</p>
          <p className="mt-1 text-sm text-muted">You can close this page.</p>
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
              {closedMessage(item.closedReason, item.status)}
            </p>
          )}
          {item.acceptingAttendance && item.checkInCodeStatus !== 'VALID' && (
            <p className="rounded-lg bg-amber-soft px-3 py-2 text-sm text-amber">
              {item.checkInCodeStatus === 'EXPIRED' ? staleCheckInCodeMessage() : missingCheckInCodeMessage()}
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
          <Field label="Student code">
            <input
              className={inputClass}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              required
            />
          </Field>
          <Field label="Student name">
            <input
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </Field>
          <Field label="Signature (optional)">
            <input
              className={inputClass}
              value={signature}
              onChange={(event) => setSignature(event.target.value)}
            />
          </Field>
          {(fieldError || submit.error) && <ErrorBlock error={fieldError ?? submit.error} />}
          <Button
            type="submit"
            className="w-full"
            disabled={!item.acceptingAttendance || item.checkInCodeStatus !== 'VALID' || submit.isPending}
          >
            {submit.isPending ? 'Registering…' : 'Register attendance'}
          </Button>
        </form>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-paper px-4 py-10">
      <div className="pointer-events-none absolute -top-16 left-1/4 h-44 w-44 rounded-full bg-accent-soft opacity-70 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-48 w-48 rounded-full bg-[#e2e7ff] opacity-60 blur-3xl" />
      <div className="relative w-full max-w-md rounded-xl bg-card p-5 shadow-[0_20px_25px_-5px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          <div>
            <p className="font-display text-sm font-semibold tracking-tight">Attendence-Up</p>
            <p className="text-xs text-muted">Attendance check-in</p>
          </div>
        </div>
        <div className="grid gap-5">{children}</div>
      </div>
    </div>
  );
}

function StatusDot({ open }: { open: boolean }) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-semibold ${
        open ? 'bg-good-soft text-good' : 'bg-mist text-muted'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${open ? 'animate-pulse bg-good' : 'bg-muted'}`} />
      {open ? 'Open' : 'Closed'}
    </span>
  );
}

function LocationCard({ state, onRetry }: { state: LocationState; onRetry: () => void }) {
  const ready = state.status === 'ready';
  const unavailable = state.status === 'unavailable';
  return (
    <div className={`rounded-lg px-3.5 py-3 text-sm ${unavailable ? 'bg-[#e2e7ff]' : 'bg-[#eaedff]'}`}>
      <p className="text-xs font-semibold tracking-wider text-muted uppercase">Location</p>
      <p className="mt-1 font-medium text-ink">
        {state.status === 'pending' && 'Requesting location…'}
        {ready && `Location detected · ±${Math.round(state.reading.locationAccuracyMeters)} m`}
        {unavailable && 'Location unavailable'}
        {state.status === 'idle' && 'Waiting for location'}
      </p>
      <p className="mt-1 text-muted">
        One reading shows roughly how far you were from the session. It does not approve or reject your
        attendance. You can still register if you deny permission.
      </p>
      {unavailable && (
        <button type="button" className="mt-2 text-sm font-medium text-accent underline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

function closedMessage(reason: string | null, status: string): string {
  if (reason === 'TOO_EARLY') return 'Attendance is not open yet.';
  if (reason === 'TOO_LATE') return 'The attendance window has closed.';
  if (status === 'CLOSED') return 'Attendance is closed.';
  return 'Attendance has not opened yet.';
}
