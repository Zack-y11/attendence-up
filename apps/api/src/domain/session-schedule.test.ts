import { zonedWallTime } from '@attendence-up/shared';
import { describe, expect, it } from 'vitest';
import { attendanceGate } from './attendance-gate';
import { attendanceStatusForWindow, endWindowNow, nextStoredStatus } from './session-schedule';

/** 08:00–09:30 and a later 16:00–17:00, both America/El_Salvador (UTC−6). */
const start = zonedWallTime(2026, 9, 29, 8, 0);
const end = zonedWallTime(2026, 9, 29, 9, 30);
const laterStart = zonedWallTime(2026, 9, 29, 16, 0);
const laterEnd = zonedWallTime(2026, 9, 29, 17, 0);

describe('session attendance window', () => {
  it('stores El Salvador wall time as the matching UTC instant', () => {
    expect(start.toISOString()).toBe('2026-09-29T14:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-29T15:30:00.000Z');
    expect(laterStart.toISOString()).toBe('2026-09-29T22:00:00.000Z');
    expect(laterEnd.toISOString()).toBe('2026-09-29T23:00:00.000Z');
  });

  it('is closed before the start', () => {
    const now = new Date(start.getTime() - 1);
    expect(attendanceStatusForWindow(start, end, now)).toBe('CLOSED');
    expect(nextStoredStatus('DRAFT', start, end, now)).toBe('CLOSED');
    expect(nextStoredStatus('OPEN', start, end, now)).toBe('CLOSED');
    expect(
      attendanceGate({ status: 'CLOSED', attendanceOpensAt: start, attendanceClosesAt: end }, now),
    ).toEqual({ ok: false, reason: 'TOO_EARLY' });
  });

  it('is open at the start without a button click', () => {
    expect(attendanceStatusForWindow(start, end, start)).toBe('OPEN');
    expect(nextStoredStatus('DRAFT', start, end, start)).toBe('OPEN');
    expect(nextStoredStatus('CLOSED', start, end, start)).toBe('OPEN');
    expect(
      attendanceGate({ status: 'OPEN', attendanceOpensAt: start, attendanceClosesAt: end }, start),
    ).toEqual({ ok: true });
  });

  it('stays open until the end and is closed at the end', () => {
    const justBeforeEnd = new Date(end.getTime() - 1);
    expect(nextStoredStatus('OPEN', start, end, justBeforeEnd)).toBe('OPEN');
    expect(
      attendanceGate(
        { status: 'OPEN', attendanceOpensAt: start, attendanceClosesAt: end },
        justBeforeEnd,
      ),
    ).toEqual({ ok: true });
    expect(attendanceStatusForWindow(start, end, end)).toBe('CLOSED');
    expect(nextStoredStatus('OPEN', start, end, end)).toBe('CLOSED');
    expect(
      attendanceGate({ status: 'CLOSED', attendanceOpensAt: start, attendanceClosesAt: end }, end),
    ).toEqual({ ok: false, reason: 'TOO_LATE' });
  });

  it('opens for a later window and closes at the new end', () => {
    const duringOldWindow = new Date(start.getTime() + 60_000);
    const betweenWindows = new Date(end.getTime() + 60_000);
    expect(nextStoredStatus('OPEN', start, end, duringOldWindow)).toBe('OPEN');
    expect(nextStoredStatus('CLOSED', start, end, betweenWindows)).toBe('CLOSED');
    expect(nextStoredStatus('CLOSED', laterStart, laterEnd, betweenWindows)).toBe('CLOSED');
    expect(nextStoredStatus('CLOSED', laterStart, laterEnd, laterStart)).toBe('OPEN');
    expect(
      attendanceGate(
        { status: 'OPEN', attendanceOpensAt: laterStart, attendanceClosesAt: laterEnd },
        laterStart,
      ),
    ).toEqual({ ok: true });
    expect(nextStoredStatus('OPEN', laterStart, laterEnd, laterEnd)).toBe('CLOSED');
    expect(
      attendanceGate(
        { status: 'CLOSED', attendanceOpensAt: laterStart, attendanceClosesAt: laterEnd },
        laterEnd,
      ),
    ).toEqual({ ok: false, reason: 'TOO_LATE' });
  });

  it('leaves a session with no full window for the instructor to open', () => {
    expect(attendanceStatusForWindow(start, null, start)).toBeNull();
    expect(attendanceStatusForWindow(null, end, start)).toBeNull();
    expect(nextStoredStatus('DRAFT', null, null, start)).toBe('DRAFT');
    expect(nextStoredStatus('DRAFT', start, null, start)).toBe('DRAFT');
    expect(nextStoredStatus('OPEN', null, end, new Date(end.getTime() - 1))).toBe('OPEN');
    expect(nextStoredStatus('OPEN', null, end, end)).toBe('CLOSED');
    expect(nextStoredStatus('OPEN', start, null, new Date(start.getTime() - 1))).toBe('DRAFT');
  });

  it('ends a scheduled window immediately when the instructor closes it', () => {
    const now = new Date(start.getTime() + 60_000);
    expect(endWindowNow(start, end, now)?.toISOString()).toBe(now.toISOString());
    expect(nextStoredStatus('CLOSED', start, now, now)).toBe('CLOSED');
    expect(endWindowNow(start, end, end)).toBeNull();
    expect(endWindowNow(null, end, now)).toBeNull();
  });
});
