import { wallClockParts, zonedWallTime } from '@attendence-up/shared';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Clock time from a stored instant, in America/El_Salvador. */
export function toTimeLocal(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const parts = wallClockParts(date);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** Store a class meeting clock on a fixed El Salvador date so the hour survives every week. */
export function fromTimeLocal(value: string): string | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return zonedWallTime(2000, 1, 1, hours, minutes).toISOString();
}

/** Put a stored clock time onto an El Salvador calendar day, keeping that hour. */
export function applyTimeOnDate(timeIso: string | null, day: Date): string | null {
  if (!timeIso) return null;
  const time = new Date(timeIso);
  if (Number.isNaN(time.getTime()) || Number.isNaN(day.getTime())) return null;
  const clock = wallClockParts(time);
  const date = wallClockParts(day);
  return zonedWallTime(date.year, date.month, date.day, clock.hour, clock.minute).toISOString();
}
