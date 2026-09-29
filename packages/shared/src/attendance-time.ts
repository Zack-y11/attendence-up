import type { SessionStatus } from './labels';

/** The app is used in El Salvador, which stays on UTC−6 all year. */
export const ATTENDANCE_TIME_ZONE = 'America/El_Salvador';

export type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/** Wall-clock parts in the attendance time zone. Month is 1–12. */
export function wallClockParts(instant: Date, timeZone = ATTENDANCE_TIME_ZONE): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const pick = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) throw new Error(`Missing ${type} for ${timeZone}.`);
    return Number(value);
  };
  let year = pick('year');
  let month = pick('month');
  let day = pick('day');
  let hour = pick('hour');
  // Some engines report midnight as hour 24 on the previous calendar day.
  if (hour === 24) {
    hour = 0;
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    year = next.getUTCFullYear();
    month = next.getUTCMonth() + 1;
    day = next.getUTCDate();
  }
  return { year, month, day, hour, minute: pick('minute'), second: pick('second') };
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const wall = wallClockParts(instant, timeZone);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return asUtc - instant.getTime();
}

/** An absolute instant for a wall clock in the attendance time zone. Month is 1–12. */
export function zonedWallTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone = ATTENDANCE_TIME_ZONE,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let instant = new Date(utcGuess);
  for (let pass = 0; pass < 2; pass += 1) {
    instant = new Date(utcGuess - zoneOffsetMs(instant, timeZone));
  }
  return instant;
}

/**
 * A closed session counts toward attendance once its start has been reached.
 * A session that is closed only because the window has not started yet does not.
 * Sessions with no start time keep the previous rule: every closed session counts.
 */
export function countsAsHeldSession(
  status: SessionStatus,
  attendanceOpensAt: string | Date | null | undefined,
  now: Date,
): boolean {
  if (status !== 'CLOSED') return false;
  if (attendanceOpensAt == null || attendanceOpensAt === '') return true;
  const opensAt =
    attendanceOpensAt instanceof Date ? attendanceOpensAt : new Date(attendanceOpensAt);
  if (Number.isNaN(opensAt.getTime())) return true;
  return opensAt.getTime() <= now.getTime();
}
