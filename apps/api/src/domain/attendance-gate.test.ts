import { describe, expect, it } from 'vitest';
import { attendanceGate, attendanceWindowEnded } from './attendance-gate';

const now = new Date('2026-09-23T14:00:00.000Z');

describe('attendanceGate', () => {
  it('rejects draft and closed sessions', () => {
    expect(
      attendanceGate({ status: 'DRAFT', attendanceOpensAt: null, attendanceClosesAt: null }, now),
    ).toEqual({ ok: false, reason: 'NOT_OPEN' });
    expect(
      attendanceGate({ status: 'CLOSED', attendanceOpensAt: null, attendanceClosesAt: null }, now),
    ).toEqual({ ok: false, reason: 'NOT_OPEN' });
  });

  it('allows an open session with no window', () => {
    expect(
      attendanceGate({ status: 'OPEN', attendanceOpensAt: null, attendanceClosesAt: null }, now),
    ).toEqual({ ok: true });
  });

  it('treats the window bounds as inclusive', () => {
    expect(
      attendanceGate(
        { status: 'OPEN', attendanceOpensAt: now, attendanceClosesAt: now },
        now,
      ),
    ).toEqual({ ok: true });
  });

  it('rejects check-in before the window opens and after it closes', () => {
    expect(
      attendanceGate(
        {
          status: 'OPEN',
          attendanceOpensAt: new Date('2026-09-23T15:00:00.000Z'),
          attendanceClosesAt: null,
        },
        now,
      ),
    ).toEqual({ ok: false, reason: 'TOO_EARLY' });
    expect(
      attendanceGate(
        {
          status: 'OPEN',
          attendanceOpensAt: null,
          attendanceClosesAt: new Date('2026-09-23T13:00:00.000Z'),
        },
        now,
      ),
    ).toEqual({ ok: false, reason: 'TOO_LATE' });
  });
});

describe('attendanceWindowEnded', () => {
  it('stays open when no close time is set or the close instant has not passed', () => {
    expect(attendanceWindowEnded(null, now)).toBe(false);
    expect(attendanceWindowEnded(now, now)).toBe(false);
    expect(attendanceWindowEnded(new Date('2026-09-23T15:00:00.000Z'), now)).toBe(false);
  });

  it('ends once the clock is past the close time', () => {
    expect(attendanceWindowEnded(new Date('2026-09-23T13:00:00.000Z'), now)).toBe(true);
  });
});
