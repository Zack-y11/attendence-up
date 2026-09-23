import type { CheckInCodeStatus } from './check-in-code';
import type { AttendanceGateReason, ClassStatus, LocationStatus, SessionStatus } from './labels';
import type { LocationInput } from './schemas';

export type LocationDto = LocationInput;

export type InstructorDto = {
  id: string;
  email: string;
  displayName: string;
  role: 'INSTRUCTOR';
};

export type ClassDto = {
  id: string;
  name: string;
  description: string;
  status: ClassStatus;
  location: LocationDto | null;
  startsAt: string | null;
  endsAt: string | null;
  sessionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SessionSummaryDto = {
  id: string;
  name: string;
  status: SessionStatus;
  attendanceOpensAt: string | null;
  attendanceCount: number;
  createdAt: string;
};

export type ClassDetailDto = ClassDto & {
  sessions: SessionSummaryDto[];
};

export type SessionDto = {
  id: string;
  publicToken: string;
  publicPath: string;
  classId: string | null;
  className: string | null;
  name: string;
  description: string;
  status: SessionStatus;
  startsAt: string | null;
  endsAt: string | null;
  attendanceOpensAt: string | null;
  attendanceClosesAt: string | null;
  location: LocationDto | null;
  attendanceCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceRecordDto = {
  id: string;
  studentCode: string;
  studentName: string;
  signature: string | null;
  latitude: number | null;
  longitude: number | null;
  locationAccuracyMeters: number | null;
  distanceFromSessionMeters: number | null;
  locationStatus: LocationStatus;
  createdAt: string;
};

export type CheckInCodeDto = {
  code: string;
  issuedAt: string;
  expiresAt: string;
  rotatesAt: string;
  publicPath: string;
  refreshSeconds: number;
  graceSeconds: number;
};

export type PublicSessionDto = {
  name: string;
  description: string;
  className: string | null;
  status: SessionStatus;
  acceptingAttendance: boolean;
  closedReason: AttendanceGateReason | null;
  requestsLocation: boolean;
  checkInCodeStatus: CheckInCodeStatus;
  startsAt: string | null;
  endsAt: string | null;
  attendanceOpensAt: string | null;
  attendanceClosesAt: string | null;
};

export type AttendanceSubmissionDto = {
  id: string;
  studentCode: string;
  studentName: string;
  createdAt: string;
};
