import { describe, expect, it } from 'vitest';
import { applyTimeOnDate, fromTimeLocal, toTimeLocal } from './meeting-time';

describe('class meeting clock', () => {
  it('round-trips a local hour without keeping the calendar day', () => {
    const stored = fromTimeLocal('08:30');
    expect(stored).toBeTruthy();
    expect(toTimeLocal(stored)).toBe('08:30');
    expect(new Date(stored ?? '').getFullYear()).toBe(2000);
  });

  it('puts that hour on the session day', () => {
    const stored = fromTimeLocal('08:30');
    const thursday = new Date(2026, 8, 24, 15, 0, 0, 0);
    const applied = applyTimeOnDate(stored, thursday);
    const when = new Date(applied ?? '');
    expect(when.getFullYear()).toBe(2026);
    expect(when.getMonth()).toBe(8);
    expect(when.getDate()).toBe(24);
    expect(when.getHours()).toBe(8);
    expect(when.getMinutes()).toBe(30);
  });

  it('rejects an empty clock', () => {
    expect(fromTimeLocal('')).toBeNull();
    expect(toTimeLocal(null)).toBe('');
    expect(applyTimeOnDate(null, new Date())).toBeNull();
  });
});
