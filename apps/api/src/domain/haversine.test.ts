import { describe, expect, it } from 'vitest';
import { haversineMeters } from './haversine';

describe('haversineMeters', () => {
  it('returns 0 for the same point', () => {
    expect(haversineMeters(13.6929, -89.2182, 13.6929, -89.2182)).toBe(0);
  });

  it('measures about 100 meters between the sample classroom and student', () => {
    const distance = haversineMeters(13.6929, -89.2182, 13.6935, -89.2175);
    expect(distance).toBeGreaterThan(95);
    expect(distance).toBeLessThan(110);
  });
});
