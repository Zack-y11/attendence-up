import type {
  AttendanceRecordDto,
  ClassDetailDto,
  ClassDto,
  InstructorDto,
  LocationDto,
  PublicSessionDto,
  SessionDto,
  SessionSummaryDto,
} from '@attendence-up/shared';
import type { AttendanceRecord, AttendanceSession, Class, User } from '@prisma/client';
import { attendanceGate } from '../domain/attendance-gate';

export function toLocation(
  latitude: number | null,
  longitude: number | null,
  radiusMeters: number | null,
): LocationDto | null {
  if (latitude == null || longitude == null || radiusMeters == null) return null;
  return { latitude, longitude, radiusMeters };
}

export function classLocationColumns(location: LocationDto | null | undefined) {
  if (location === undefined) return {};
  if (location === null) {
    return { defaultLatitude: null, defaultLongitude: null, defaultRadiusMeters: null };
  }
  return {
    defaultLatitude: location.latitude,
    defaultLongitude: location.longitude,
    defaultRadiusMeters: location.radiusMeters,
  };
}

export function sessionLocationColumns(location: LocationDto | null | undefined) {
  if (location === undefined) return {};
  if (location === null) {
    return { locationLatitude: null, locationLongitude: null, locationRadiusMeters: null };
  }
  return {
    locationLatitude: location.latitude,
    locationLongitude: location.longitude,
    locationRadiusMeters: location.radiusMeters,
  };
}

export function classScheduleColumns(input: { startsAt?: string | null; endsAt?: string | null }) {
  const data: { startsAt?: Date | null; endsAt?: Date | null } = {};
  if (input.startsAt !== undefined) data.startsAt = input.startsAt ? new Date(input.startsAt) : null;
  if (input.endsAt !== undefined) data.endsAt = input.endsAt ? new Date(input.endsAt) : null;
  return data;
}

export function dateColumns(input: {
  attendanceOpensAt?: string | null;
  attendanceClosesAt?: string | null;
}) {
  const data: {
    attendanceOpensAt?: Date | null;
    attendanceClosesAt?: Date | null;
  } = {};
  if (input.attendanceOpensAt !== undefined) {
    data.attendanceOpensAt = input.attendanceOpensAt ? new Date(input.attendanceOpensAt) : null;
  }
  if (input.attendanceClosesAt !== undefined) {
    data.attendanceClosesAt = input.attendanceClosesAt ? new Date(input.attendanceClosesAt) : null;
  }
  return data;
}

type ClassWithCount = Class & { _count: { sessions: number } };

export function presentClass(item: ClassWithCount): ClassDto {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    status: item.status,
    location: toLocation(item.defaultLatitude, item.defaultLongitude, item.defaultRadiusMeters),
    startsAt: item.startsAt?.toISOString() ?? null,
    endsAt: item.endsAt?.toISOString() ?? null,
    sessionCount: item._count.sessions,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

type SessionSummarySource = Pick<
  AttendanceSession,
  'id' | 'name' | 'status' | 'attendanceOpensAt' | 'createdAt'
> & { _count: { records: number } };

export function presentSessionSummary(item: SessionSummarySource): SessionSummaryDto {
  return {
    id: item.id,
    name: item.name,
    status: item.status,
    attendanceOpensAt: item.attendanceOpensAt?.toISOString() ?? null,
    attendanceCount: item._count.records,
    createdAt: item.createdAt.toISOString(),
  };
}

export function presentClassDetail(
  item: ClassWithCount,
  sessions: SessionSummarySource[],
): ClassDetailDto {
  return {
    ...presentClass(item),
    sessions: sessions.map(presentSessionSummary),
  };
}

type ClassSchedule = { name: string; startsAt: Date | null; endsAt: Date | null };

type SessionWithRelations = AttendanceSession & {
  class: ClassSchedule | null;
  _count: { records: number };
};

export function presentSession(item: SessionWithRelations): SessionDto {
  return {
    id: item.id,
    publicToken: item.publicToken,
    publicPath: `/attendance/${item.publicToken}`,
    classId: item.classId,
    className: item.class?.name ?? null,
    name: item.name,
    description: item.description,
    status: item.status,
    startsAt: item.class?.startsAt?.toISOString() ?? null,
    endsAt: item.class?.endsAt?.toISOString() ?? null,
    attendanceOpensAt: item.attendanceOpensAt?.toISOString() ?? null,
    attendanceClosesAt: item.attendanceClosesAt?.toISOString() ?? null,
    location: toLocation(item.locationLatitude, item.locationLongitude, item.locationRadiusMeters),
    attendanceCount: item._count.records,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function presentRecord(item: AttendanceRecord): AttendanceRecordDto {
  return {
    id: item.id,
    studentCode: item.studentCode,
    studentName: item.studentName,
    signature: item.signature,
    latitude: item.latitude,
    longitude: item.longitude,
    locationAccuracyMeters: item.locationAccuracyMeters,
    distanceFromSessionMeters: item.distanceFromSessionMeters,
    locationStatus: item.locationStatus,
    createdAt: item.createdAt.toISOString(),
  };
}

export function presentPublicSession(
  item: AttendanceSession & { class: ClassSchedule | null },
  now: Date,
): PublicSessionDto {
  const gate = attendanceGate(item, now);
  return {
    name: item.name,
    description: item.description,
    className: item.class?.name ?? null,
    status: item.status,
    acceptingAttendance: gate.ok,
    closedReason: gate.ok ? null : gate.reason,
    requestsLocation: item.locationLatitude != null && item.locationLongitude != null,
    startsAt: item.class?.startsAt?.toISOString() ?? null,
    endsAt: item.class?.endsAt?.toISOString() ?? null,
    attendanceOpensAt: item.attendanceOpensAt?.toISOString() ?? null,
    attendanceClosesAt: item.attendanceClosesAt?.toISOString() ?? null,
  };
}

export function presentInstructor(user: User): InstructorDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: 'INSTRUCTOR',
  };
}
