import { describe, expect, it } from 'vitest';
import { rotationDelayMs, secondsUntilRotation } from './checkInRotation';

describe('QR rotation schedule', () => {
  const now = Date.parse('2026-09-23T14:00:00.000Z');

  it('waits until the server says the on-screen code rotates', () => {
    const rotatesAt = new Date(now + 12_400).toISOString();
    expect(rotationDelayMs(rotatesAt, now)).toBe(12_400);
    expect(secondsUntilRotation(rotatesAt, now)).toBe(13);
  });

  it('retries soon when the on-screen code is already due', () => {
    const rotatesAt = new Date(now - 500).toISOString();
    expect(rotationDelayMs(rotatesAt, now)).toBe(1_000);
    expect(secondsUntilRotation(rotatesAt, now)).toBe(0);
  });

  it('falls back when the rotation time is missing', () => {
    expect(rotationDelayMs(undefined, now)).toBe(30_000);
    expect(rotationDelayMs('not-a-date', now)).toBe(30_000);
  });
});
