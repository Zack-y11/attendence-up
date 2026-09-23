import type { LocationInput } from '@attendence-up/shared';

/**
 * `undefined` means the client omitted location, so a class default may be copied.
 * `null` means the instructor explicitly cleared it.
 */
export function resolveSessionLocation(
  requested: LocationInput | null | undefined,
  classDefault: LocationInput | null,
): LocationInput | null {
  if (requested !== undefined) return requested;
  return classDefault;
}
