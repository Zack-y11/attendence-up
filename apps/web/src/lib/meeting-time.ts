/** Clock time from a stored instant, in the browser's local zone. */
export function toTimeLocal(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Store a class meeting clock on a fixed local date so the hour survives every week. */
export function fromTimeLocal(value: string): string | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  const date = new Date(2000, 0, 1, hours, minutes, 0, 0);
  return date.toISOString();
}

/** Put a stored clock time onto a calendar day, keeping the local hour. */
export function applyTimeOnDate(timeIso: string | null, day: Date): string | null {
  if (!timeIso) return null;
  const time = new Date(timeIso);
  if (Number.isNaN(time.getTime()) || Number.isNaN(day.getTime())) return null;
  const next = new Date(day);
  next.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return next.toISOString();
}
