/** Move a check-in instant forward by whole days, keeping the same UTC clock time. */
export function shiftByDays(value: Date | null, days: number): Date | null {
  if (!value || days === 0) return value;
  const next = new Date(value.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
