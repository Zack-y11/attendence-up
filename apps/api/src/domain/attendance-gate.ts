import type { AttendanceGateReason, SessionStatus } from '@attendence-up/shared';

export type SessionGateInput = {
  status: SessionStatus;
  attendanceOpensAt: Date | null;
  attendanceClosesAt: Date | null;
};

export type AttendanceGate = { ok: true } | { ok: false; reason: AttendanceGateReason };

/**
 * A configured window is checked before status so a scheduled session that is
 * closed still tells students whether they are early or late. The start
 * instant is inside the window. The end instant still accepts check-in.
 */
export function attendanceGate(session: SessionGateInput, now: Date): AttendanceGate {
  if (session.attendanceClosesAt && now > session.attendanceClosesAt) {
    return { ok: false, reason: 'TOO_LATE' };
  }
  if (session.attendanceOpensAt && now < session.attendanceOpensAt) {
    return { ok: false, reason: 'TOO_EARLY' };
  }
  if (session.status !== 'OPEN') {
    return { ok: false, reason: 'NOT_OPEN' };
  }
  return { ok: true };
}

/** The close instant itself still counts as inside the window. */
export function attendanceWindowEnded(closesAt: Date | null, now: Date): boolean {
  return closesAt != null && now > closesAt;
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
