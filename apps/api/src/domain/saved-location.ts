import type { LocationDto } from '@attendence-up/shared';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';

/**
 * Copies an owned saved location when the client sends its id and omits coordinates.
 * An explicit location wins, but a foreign id is still rejected.
 * Returns undefined when the client did not mention location at all.
 */
export async function resolveInstructorLocation(
  instructorId: string,
  input: { location?: LocationDto | null; savedLocationId?: string },
): Promise<LocationDto | null | undefined> {
  if (input.savedLocationId) {
    const saved = await prisma.savedLocation.findFirst({
      where: { id: input.savedLocationId, instructorId },
    });
    if (!saved) throw new AppError(404, 'Saved location not found.');
    if (input.location === undefined) {
      return {
        latitude: saved.latitude,
        longitude: saved.longitude,
        radiusMeters: saved.radiusMeters,
      };
    }
  }
  return input.location;
}
