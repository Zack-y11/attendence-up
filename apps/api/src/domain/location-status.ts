import type { LocationStatus } from '@attendence-up/shared';
import { haversineMeters } from './haversine';

export const LOW_ACCURACY_THRESHOLD_METERS = 100;

export type ReportedLocation = {
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
};

export type ExpectedLocation = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
} | null;

/**
 * Location status is contextual information for the instructor.
 * It never accepts or rejects the attendance record.
 *
 * A coarse reading can still prove someone is far away. Low accuracy is used
 * only when the accuracy circle overlaps the expected radius, so the point
 * could be inside or outside.
 */
export function deriveLocationStatus(
  reported: ReportedLocation,
  expected: ExpectedLocation,
): { status: LocationStatus; distanceMeters: number | null } {
  if (reported.latitude == null || reported.longitude == null) {
    return { status: 'LOCATION_UNAVAILABLE', distanceMeters: null };
  }

  if (!expected) {
    return { status: 'NO_EXPECTED_LOCATION', distanceMeters: null };
  }

  const distanceMeters = haversineMeters(
    expected.latitude,
    expected.longitude,
    reported.latitude,
    reported.longitude,
  );

  if (reported.accuracyMeters != null && reported.accuracyMeters > LOW_ACCURACY_THRESHOLD_METERS) {
    const closestPossibleMeters = distanceMeters - reported.accuracyMeters;
    const farthestPossibleMeters = distanceMeters + reported.accuracyMeters;
    if (closestPossibleMeters > expected.radiusMeters) {
      return { status: 'OUTSIDE_RADIUS', distanceMeters };
    }
    if (farthestPossibleMeters <= expected.radiusMeters) {
      return { status: 'WITHIN_RADIUS', distanceMeters };
    }
    return { status: 'LOW_ACCURACY', distanceMeters };
  }

  if (distanceMeters <= expected.radiusMeters) {
    return { status: 'WITHIN_RADIUS', distanceMeters };
  }

  return { status: 'OUTSIDE_RADIUS', distanceMeters };
}
