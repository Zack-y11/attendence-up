import { describe, expect, it } from 'vitest';
import { deriveLocationStatus } from './location-status';

const classroom = { latitude: 13.6929, longitude: -89.2182, radiusMeters: 200 };

describe('deriveLocationStatus', () => {
  it('marks a missing reading without calculating distance', () => {
    expect(
      deriveLocationStatus(
        { latitude: null, longitude: null, accuracyMeters: null },
        classroom,
      ),
    ).toEqual({ status: 'LOCATION_UNAVAILABLE', distanceMeters: null });
  });

  it('keeps a reading when the session has no classroom location', () => {
    expect(
      deriveLocationStatus({ latitude: 13.7, longitude: -89.2, accuracyMeters: 10 }, null),
    ).toEqual({ status: 'NO_EXPECTED_LOCATION', distanceMeters: null });
  });

  it('prefers low accuracy over the radius comparison and still stores distance', () => {
    const result = deriveLocationStatus(
      { latitude: 13.6935, longitude: -89.2175, accuracyMeters: 150 },
      classroom,
    );
    expect(result.status).toBe('LOW_ACCURACY');
    expect(result.distanceMeters).toBeGreaterThan(95);
    expect(result.distanceMeters).toBeLessThan(110);
  });

  it('marks a nearby accurate reading as within the radius', () => {
    const result = deriveLocationStatus(
      { latitude: 13.6935, longitude: -89.2175, accuracyMeters: 18 },
      classroom,
    );
    expect(result.status).toBe('WITHIN_RADIUS');
  });

  it('marks a far accurate reading as outside the radius', () => {
    const result = deriveLocationStatus(
      { latitude: 13.71, longitude: -89.25, accuracyMeters: 20 },
      classroom,
    );
    expect(result.status).toBe('OUTSIDE_RADIUS');
    expect(result.distanceMeters).toBeGreaterThan(200);
  });

  it('treats unknown accuracy as usable and compares the radius', () => {
    const result = deriveLocationStatus(
      { latitude: 13.6935, longitude: -89.2175, accuracyMeters: null },
      classroom,
    );
    expect(result.status).toBe('WITHIN_RADIUS');
  });
});
