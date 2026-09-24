export function formatDistance(meters: number | null): string {
  if (meters == null || Number.isNaN(meters)) return '';
  if (meters >= 1000) {
    const kilometers = meters / 1000;
    return `${kilometers >= 10 ? kilometers.toFixed(0) : kilometers.toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function formatAccuracy(meters: number | null): string {
  if (meters == null || Number.isNaN(meters)) return '';
  return `±${Math.round(meters)} m`;
}

/** Empty when there is no denominator. Whole numbers omit the decimal. */
export function formatAttendancePercentage(percentage: number | null): string {
  if (percentage == null || Number.isNaN(percentage)) return '';
  const tenths = Math.round(percentage * 10) / 10;
  const text = Number.isInteger(tenths) ? String(tenths) : tenths.toFixed(1);
  return `${text}%`;
}

export function formatCoordinate(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '';
  return value.toFixed(6);
}

export function formatInstant(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(iso));
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}
