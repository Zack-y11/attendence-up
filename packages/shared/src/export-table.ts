import { resolveExportColumns, type ExportColumnId, EXPORT_COLUMNS } from './export-columns';
import { formatAccuracy, formatCoordinate, formatDistance, formatInstant } from './format';
import {
  ATTENDANCE_STATUS_LABELS,
  LOCATION_STATUS_LABELS,
  type AttendanceStatus,
  type LocationStatus,
} from './labels';

export type ExportRecord = {
  studentCode: string;
  studentName: string;
  signature: string | null;
  createdAt: string;
  distanceFromSessionMeters: number | null;
  locationAccuracyMeters: number | null;
  locationStatus: LocationStatus;
  attendanceStatus: AttendanceStatus;
  absenceNote: string | null;
  latitude: number | null;
  longitude: number | null;
};

const LABELS = new Map(EXPORT_COLUMNS.map((column) => [column.id, column.label]));

function cell(
  column: ExportColumnId,
  record: ExportRecord,
  sessionName: string,
  className: string | null,
  timeZone: string,
): string {
  switch (column) {
    case 'studentCode':
      return record.studentCode;
    case 'studentName':
      return record.studentName;
    case 'signature':
      return record.signature ?? '';
    case 'attendanceTime':
      return formatInstant(record.createdAt, timeZone);
    case 'distance':
      return formatDistance(record.distanceFromSessionMeters);
    case 'accuracy':
      return formatAccuracy(record.locationAccuracyMeters);
    case 'attendanceStatus':
      return ATTENDANCE_STATUS_LABELS[record.attendanceStatus];
    case 'absenceNote':
      return record.absenceNote ?? '';
    case 'locationStatus':
      return LOCATION_STATUS_LABELS[record.locationStatus];
    case 'sessionName':
      return sessionName;
    case 'className':
      return className ?? '';
    case 'latitude':
      return formatCoordinate(record.latitude);
    case 'longitude':
      return formatCoordinate(record.longitude);
  }
}

export function buildExportTable(input: {
  columns: ExportColumnId[];
  sessionName: string;
  className: string | null;
  timeZone: string;
  records: ExportRecord[];
}): { headers: string[]; rows: string[][] } {
  return {
    headers: input.columns.map((column) => LABELS.get(column) ?? column),
    rows: input.records.map((record) =>
      input.columns.map((column) =>
        cell(column, record, input.sessionName, input.className, input.timeZone),
      ),
    ),
  };
}

export { resolveExportColumns };