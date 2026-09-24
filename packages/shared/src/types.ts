import type {
  AttendanceGateReason,
  AttendanceStatus,
  ClassStatus,
  LocationStatus,
  SessionStatus,
} from './labels';
import type { LocationInput } from './schemas';

export type LocationDto = LocationInput;

export type InstructorDto = {
  id: string;
  email: string;
  displayName: string;
  role: 'INSTRUCTOR';
  university: string;
  faculty: string;
  career: string;
  printName: string;
  logo: string | null;
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
  attendanceStatus: AttendanceStatus;
  absenceNote: string | null;
  createdAt: string;
};

export type PublicSessionDto = {
  name: string;
  description: string;
  className: string | null;
  status: SessionStatus;
  acceptingAttendance: boolean;
  closedReason: AttendanceGateReason | null;
  requestsLocation: boolean;
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