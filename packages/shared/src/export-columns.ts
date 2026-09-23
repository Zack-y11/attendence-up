export const EXPORT_COLUMNS = [
  { id: 'studentCode', label: 'Student code', defaultSelected: true },
  { id: 'studentName', label: 'Student name', defaultSelected: true },
  { id: 'signature', label: 'Signature', defaultSelected: true },
  { id: 'attendanceTime', label: 'Attendance time', defaultSelected: true },
  { id: 'distance', label: 'Distance', defaultSelected: true },
  { id: 'accuracy', label: 'Location accuracy', defaultSelected: true },
  { id: 'locationStatus', label: 'Location status', defaultSelected: true },
  { id: 'sessionName', label: 'Session name', defaultSelected: true },
  { id: 'className', label: 'Class name', defaultSelected: true },
  { id: 'latitude', label: 'Latitude', defaultSelected: false },
  { id: 'longitude', label: 'Longitude', defaultSelected: false },
] as const;

export type ExportColumnId = (typeof EXPORT_COLUMNS)[number]['id'];

export const DEFAULT_EXPORT_COLUMN_IDS: ExportColumnId[] = EXPORT_COLUMNS.filter(
  (column) => column.defaultSelected,
).map((column) => column.id);

const COLUMN_IDS = new Set<string>(EXPORT_COLUMNS.map((column) => column.id));

export function isExportColumnId(value: string): value is ExportColumnId {
  return COLUMN_IDS.has(value);
}

/** Omitted or blank input uses the default columns. Unknown ids are ignored. Order follows the allowlist. */
export function resolveExportColumns(raw: string | undefined): ExportColumnId[] {
  if (!raw || raw.trim() === '') return [...DEFAULT_EXPORT_COLUMN_IDS];
  const requested = new Set(
    raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
  );
  return EXPORT_COLUMNS.filter((column) => requested.has(column.id)).map((column) => column.id);
}
