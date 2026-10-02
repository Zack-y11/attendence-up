/** True while a configured window has not reached its end, so the UI should keep asking the API. */
export function attendanceStillScheduled(
  attendanceOpensAt: string | null | undefined,
  attendanceClosesAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!attendanceOpensAt || !attendanceClosesAt) return false;
  const closesAt = new Date(attendanceClosesAt).getTime();
  return !Number.isNaN(closesAt) && now < closesAt;
}
