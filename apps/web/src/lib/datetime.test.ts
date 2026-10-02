import { describe, expect, it, vi } from 'vitest';

vi.mock('../i18n', () => ({
  default: { resolvedLanguage: 'en', language: 'en' },
}));

import { fromDatetimeLocal, toDatetimeLocal } from './datetime';
import { applyTimeOnDate, fromTimeLocal, toTimeLocal } from './meeting-time';

describe('class meeting clock', () => {
  it('stores the hour in America/El_Salvador', () => {
    const stored = fromTimeLocal('08:30');
    expect(stored).toBe('2000-01-01T14:30:00.000Z');
    expect(toTimeLocal(stored)).toBe('08:30');
  });

  it('puts that hour on the El Salvador calendar day', () => {
    const stored = fromTimeLocal('08:30');
    // 03:00Z is still the previous evening in El Salvador.
    const lateEvening = new Date('2026-09-24T03:00:00.000Z');
    expect(applyTimeOnDate(stored, lateEvening)).toBe('2026-09-23T14:30:00.000Z');
    const afternoon = new Date('2026-09-24T21:00:00.000Z');
    expect(applyTimeOnDate(stored, afternoon)).toBe('2026-09-24T14:30:00.000Z');
  });

  it('rejects an empty clock', () => {
    expect(fromTimeLocal('')).toBeNull();
    expect(toTimeLocal(null)).toBe('');
    expect(applyTimeOnDate(null, new Date())).toBeNull();
  });
});

describe('session window clock', () => {
  it('reads and writes the check-in window in America/El_Salvador', () => {
    expect(fromDatetimeLocal('2026-09-29T08:00')).toBe('2026-09-29T14:00:00.000Z');
    expect(toDatetimeLocal('2026-09-29T14:00:00.000Z')).toBe('2026-09-29T08:00');
    expect(fromDatetimeLocal('')).toBeNull();
    expect(toDatetimeLocal(null)).toBe('');
  });
});
