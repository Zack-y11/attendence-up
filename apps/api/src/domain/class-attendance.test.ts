import { describe, expect, it } from 'vitest';
import {
  EXCUSED_COUNTS_IN_DENOMINATOR,
  countsAsAttended,
  ownedClassAttendanceQuery,
  summarizeClassAttendance,
  type ClassAttendanceSessionInput,
} from './class-attendance';

function at(iso: string): Date {
  return new Date(iso);
}

/**
 * Three closed meetings, one open meeting, and one draft.
 * Totals assume excused sessions are removed from the denominator.
 */
function seededSessions(): ClassAttendanceSessionInput[] {
  return [
    {
      status: 'CLOSED',
      records: [
        {
          studentCode: 'SM001',
          studentName: 'Ana',
          attendanceStatus: 'PRESENT',
          createdAt: at('2026-09-01T15:00:00Z'),
        },
        {
          studentCode: 'SM002',
          studentName: 'Luis',
          attendanceStatus: 'LATE',
          createdAt: at('2026-09-01T15:05:00Z'),
        },
        {
          studentCode: 'SM003',
          studentName: 'Mia',
          attendanceStatus: 'ABSENT',
          createdAt: at('2026-09-01T15:06:00Z'),
        },
        {
          studentCode: 'SM004',
          studentName: 'Eve',
          attendanceStatus: 'EXCUSED',
          createdAt: at('2026-09-01T15:07:00Z'),
        },
        {
          studentCode: 'SM007',
          studentName: 'Sol',
          attendanceStatus: 'EXCUSED',
          createdAt: at('2026-09-01T15:08:00Z'),
        },
      ],
    },
    {
      status: 'CLOSED',
      records: [
        {
          studentCode: 'SM001',
          studentName: 'Ana Lopez',
          attendanceStatus: 'LATE',
          createdAt: at('2026-09-08T15:00:00Z'),
        },
        {
          studentCode: 'SM002',
          studentName: 'Luis Mora',
          attendanceStatus: 'ABSENT',
          createdAt: at('2026-09-08T15:05:00Z'),
        },
        {
          studentCode: 'SM004',
          studentName: 'Eve',
          attendanceStatus: 'PRESENT',
          createdAt: at('2026-09-08T15:08:00Z'),
        },
        {
          studentCode: 'SM007',
          studentName: 'Sol',
          attendanceStatus: 'EXCUSED',
          createdAt: at('2026-09-08T15:09:00Z'),
        },
      ],
    },
    {
      status: 'CLOSED',
      records: [
        {
          studentCode: 'SM001',
          studentName: 'Ana Lopez',
          attendanceStatus: 'EXCUSED',
          createdAt: at('2026-09-15T15:00:00Z'),
        },
        {
          studentCode: 'SM004',
          studentName: 'Eve',
          attendanceStatus: 'EXCUSED',
          createdAt: at('2026-09-15T15:01:00Z'),
        },
        {
          studentCode: 'SM007',
          studentName: 'Sol Rivas',
          attendanceStatus: 'EXCUSED',
          createdAt: at('2026-09-15T15:02:00Z'),
        },
      ],
    },
    {
      status: 'OPEN',
      records: [
        {
          studentCode: 'SM001',
          studentName: 'Ana López Ruiz',
          attendanceStatus: 'PRESENT',
          createdAt: at('2026-09-22T15:00:00Z'),
        },
        {
          studentCode: 'SM002',
          studentName: 'Luis M. Mora',
          attendanceStatus: 'PRESENT',
          createdAt: at('2026-09-22T15:10:00Z'),
        },
        {
          studentCode: 'SM005',
          studentName: 'Nia',
          attendanceStatus: 'PRESENT',
          createdAt: at('2026-09-22T15:04:00Z'),
        },
      ],
    },
    {
      status: 'DRAFT',
      records: [
        {
          studentCode: 'SM006',
          studentName: 'Otto',
          attendanceStatus: 'PRESENT',
          createdAt: at('2026-09-20T15:00:00Z'),
        },
      ],
    },
  ];
}

describe('summarizeClassAttendance', () => {
  it('counts late as attended, drops excused from the total, ignores open and draft sessions, and keeps a student who missed every closed session', () => {
    expect(EXCUSED_COUNTS_IN_DENOMINATOR).toBe(false);
    expect(countsAsAttended('PRESENT')).toBe(true);
    expect(countsAsAttended('LATE')).toBe(true);
    expect(countsAsAttended('ABSENT')).toBe(false);
    expect(countsAsAttended('EXCUSED')).toBe(false);

    const summary = summarizeClassAttendance(seededSessions());

    expect(summary.closedSessionCount).toBe(3);
    expect(summary.excusedCountsInDenominator).toBe(false);
    expect(summary.students).toEqual([
      // Present, late, excused. Open present is ignored. 2 attended / (3 - 1 excused).
      // Latest name comes from the open session.
      {
        studentCode: 'SM001',
        studentName: 'Ana López Ruiz',
        attended: 2,
        total: 2,
        percentage: 100,
      },
      // The only attended session is Late. Absent and the open present do not add more.
      {
        studentCode: 'SM002',
        studentName: 'Luis M. Mora',
        attended: 1,
        total: 3,
        percentage: 33.3,
      },
      // Checked in once, marked absent, and missed the other closed sessions.
      { studentCode: 'SM003', studentName: 'Mia', attended: 0, total: 3, percentage: 0 },
      // One present and two excused: excused sessions leave the total.
      { studentCode: 'SM004', studentName: 'Eve', attended: 1, total: 1, percentage: 100 },
      // Only check-in is an open session, so every closed session was missed.
      { studentCode: 'SM005', studentName: 'Nia', attended: 0, total: 3, percentage: 0 },
      // Draft check-in does not count, and does not shrink the closed total.
      { studentCode: 'SM006', studentName: 'Otto', attended: 0, total: 3, percentage: 0 },
      // Excused from every closed session: nothing left to score.
      { studentCode: 'SM007', studentName: 'Sol Rivas', attended: 0, total: 0, percentage: null },
    ]);
  });
});

describe('ownedClassAttendanceQuery', () => {
  it('filters the class and its sessions by the instructor who owns the class', () => {
    const query = ownedClassAttendanceQuery('class-1', 'instructor-9');
    expect(query.where).toEqual({ id: 'class-1', ownerId: 'instructor-9' });
    expect(query.select.sessions.where).toEqual({ instructorId: 'instructor-9' });

    const other = ownedClassAttendanceQuery('class-1', 'instructor-2');
    expect(other.where).toEqual({ id: 'class-1', ownerId: 'instructor-2' });
    expect(other.select.sessions.where).toEqual({ instructorId: 'instructor-2' });
  });
});
