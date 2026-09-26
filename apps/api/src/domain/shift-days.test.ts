import { describe, expect, it } from 'vitest';
import { shiftByDays } from './shift-days';

describe('shiftByDays', () => {
  it('keeps the clock time when the day moves', () => {
    const start = new Date('2026-09-24T14:00:00.000Z');
    expect(shiftByDays(start, 7)?.toISOString()).toBe('2026-10-01T14:00:00.000Z');
  });

  it('crosses a month boundary without changing the hour', () => {
    const start = new Date('2026-01-30T02:30:00.000Z');
    expect(shiftByDays(start, 7)?.toISOString()).toBe('2026-02-06T02:30:00.000Z');
  });

  it('returns the same instant when nothing shifts', () => {
    const start = new Date('2026-09-24T14:00:00.000Z');
    expect(shiftByDays(start, 0)).toBe(start);
    expect(shiftByDays(null, 7)).toBeNull();
  });
});
