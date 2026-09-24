import i18n from '../i18n';

function activeLocale(): string {
  return i18n.resolvedLanguage ?? i18n.language ?? 'en';
}

export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(activeLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat(activeLocale(), { dateStyle: 'full' }).format(date);
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(activeLocale(), { timeStyle: 'short' }).format(new Date(iso));
}

export function numberOrNan(value: string): number {
  if (value.trim() === '') return Number.NaN;
  return Number(value);
}
