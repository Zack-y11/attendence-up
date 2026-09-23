export const SESSION_STATUSES = ['DRAFT', 'OPEN', 'CLOSED'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const CLASS_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;
export type ClassStatus = (typeof CLASS_STATUSES)[number];

export const LOCATION_STATUSES = [
  'WITHIN_RADIUS',
  'OUTSIDE_RADIUS',
  'LOCATION_UNAVAILABLE',
  'LOW_ACCURACY',
  'NO_EXPECTED_LOCATION',
] as const;
export type LocationStatus = (typeof LOCATION_STATUSES)[number];

export const ATTENDANCE_STATUSES = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  LATE: 'Late',
  ABSENT: 'Absent',
  EXCUSED: 'Excused',
};

export const LOCATION_STATUS_LABELS: Record<LocationStatus, string> = {
  WITHIN_RADIUS: 'Near session',
  OUTSIDE_RADIUS: 'Outside expected area',
  LOCATION_UNAVAILABLE: 'Location unavailable',
  LOW_ACCURACY: 'Low accuracy',
  NO_EXPECTED_LOCATION: 'No classroom location',
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  CLOSED: 'Closed',
};

export const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
};

export const ATTENDANCE_GATE_REASONS = ['NOT_OPEN', 'TOO_EARLY', 'TOO_LATE'] as const;
export type AttendanceGateReason = (typeof ATTENDANCE_GATE_REASONS)[number];
