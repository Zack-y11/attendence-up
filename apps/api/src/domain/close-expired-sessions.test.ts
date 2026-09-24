import { describe, expect, it } from 'vitest';
import { attendanceWindowEnded } from './close-expired-sessions';

const now = new Date('2026-09-24T16:22:00.000Z');

describe('attendanceWindowEnded', () => {
  it('stays open when no close time is set or the close instant has not passed', () => {
    expect(attendanceWindowEnded(null, now)).toBe(false);
    expect(attendanceWindowEnded(now, now)).toBe(false);
    expect(attendanceWindowEnded(new Date('2026-09-24T16:23:00.000Z'), now)).toBe(false);
  });

  it('ends once the clock is past the close time', () => {
    expect(attendanceWindowEnded(new Date('2026-09-24T07:40:00.000Z'), now)).toBe(true);
  });
});
