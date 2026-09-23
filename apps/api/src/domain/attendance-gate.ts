import type { AttendanceGateReason, SessionStatus } from '@attendence-up/shared';

export type SessionGateInput = {
  status: SessionStatus;
  attendanceOpensAt: Date | null;
  attendanceClosesAt: Date | null;
};

export type AttendanceGate = { ok: true } | { ok: false; reason: AttendanceGateReason };

/** Schedule times (startsAt/endsAt) do not gate check-in. Only OPEN plus the optional window does. */
export function attendanceGate(session: SessionGateInput, now: Date): AttendanceGate {
  if (session.status !== 'OPEN') {
    return { ok: false, reason: 'NOT_OPEN' };
  }
  if (session.attendanceOpensAt && now < session.attendanceOpensAt) {
    return { ok: false, reason: 'TOO_EARLY' };
  }
  if (session.attendanceClosesAt && now > session.attendanceClosesAt) {
    return { ok: false, reason: 'TOO_LATE' };
  }
  return { ok: true };
}

export function attendanceGateMessage(reason: AttendanceGateReason): string {
  switch (reason) {
    case 'NOT_OPEN':
      return 'This attendance session is not open.';
    case 'TOO_EARLY':
      return 'Attendance is not open yet.';
    case 'TOO_LATE':
      return 'The attendance window has closed.';
  }
}
