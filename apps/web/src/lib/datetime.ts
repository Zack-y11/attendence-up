import { ATTENDANCE_TIME_ZONE, wallClockParts, zonedWallTime } from '@attendence-up/shared';
import i18n from '../i18n';
import { applyTimeOnDate, fromTimeLocal, toTimeLocal } from './meeting-time';

export { applyTimeOnDate, fromTimeLocal, toTimeLocal };

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function activeLocale(): string {
  return i18n.resolvedLanguage ?? i18n.language ?? 'en';
}

export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const parts = wallClockParts(date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** A datetime-local value is a wall clock in America/El_Salvador, not the browser zone. */
export function fromDatetimeLocal(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  return zonedWallTime(year, month, day, hour, minute).toISOString();
}

export function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(activeLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: ATTENDANCE_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat(activeLocale(), {
    dateStyle: 'full',
    timeZone: ATTENDANCE_TIME_ZONE,
  }).format(date);
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(activeLocale(), {
    timeStyle: 'short',
    timeZone: ATTENDANCE_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatClock(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return formatTime(iso);
}

export function formatMeeting(startsAt: string | null, endsAt: string | null): string {
  if (startsAt && endsAt) return `${formatClock(startsAt)} – ${formatClock(endsAt)}`;
  if (startsAt || endsAt) return formatClock(startsAt ?? endsAt);
  return '—';
}

export function numberOrNan(value: string): number {
  if (value.trim() === '') return Number.NaN;
  return Number(value);
}
