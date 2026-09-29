import type { SessionStatus } from '@attendence-up/shared';

/**
 * Status implied by a session's check-in window.
 * The start instant is open. The end instant is closed.
 * A missing bound returns null so the instructor still opens that session by hand.
 */
export function attendanceStatusForWindow(
  opensAt: Date | null,
  closesAt: Date | null,
  now: Date,
): Extract<SessionStatus, 'OPEN' | 'CLOSED'> | null {
  if (opensAt == null || closesAt == null) return null;
  return now >= opensAt && now < closesAt ? 'OPEN' : 'CLOSED';
}

/**
 * Next stored status. A full window replaces the previous status, so a later
 * window can open a session that had already closed. Partial windows only
 * stop an open session from running before its start or after its end.
 */
export function nextStoredStatus(
  status: SessionStatus,
  opensAt: Date | null,
  closesAt: Date | null,
  now = new Date(),
): SessionStatus {
  const scheduled = attendanceStatusForWindow(opensAt, closesAt, now);
  if (scheduled) return scheduled;
  if (status === 'OPEN' && opensAt != null && now < opensAt) return 'DRAFT';
  if (status === 'OPEN' && closesAt != null && now >= closesAt) return 'CLOSED';
  return status;
}

export function resolveAttendanceWindow(
  input: { attendanceOpensAt?: Date | null; attendanceClosesAt?: Date | null },
  existing?: { attendanceOpensAt: Date | null; attendanceClosesAt: Date | null },
): { attendanceOpensAt: Date | null; attendanceClosesAt: Date | null } {
  return {
    attendanceOpensAt:
      input.attendanceOpensAt !== undefined
        ? input.attendanceOpensAt
        : (existing?.attendanceOpensAt ?? null),
    attendanceClosesAt:
      input.attendanceClosesAt !== undefined
        ? input.attendanceClosesAt
        : (existing?.attendanceClosesAt ?? null),
  };
}

/**
 * Closing during a scheduled window moves the end to now so the session stays
 * closed. The next window the instructor saves opens and closes on its own.
 */
export function endWindowNow(opensAt: Date | null, closesAt: Date | null, now: Date): Date | null {
  if (opensAt == null || closesAt == null) return null;
  if (now >= opensAt && now < closesAt) return now;
  return null;
}
