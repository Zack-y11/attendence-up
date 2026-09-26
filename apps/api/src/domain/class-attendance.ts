import type { AttendanceStatus, ClassAttendanceDto, SessionStatus } from '@attendence-up/shared';
import type { Prisma } from '@prisma/client';

/**
 * Excused sessions are left out of the denominator.
 * An excused absence was waived, so it does not lower the percentage.
 * Set this to true to keep excused sessions in the total (they still do not count as attended).
 */
export const EXCUSED_COUNTS_IN_DENOMINATOR = false;

export function countsAsAttended(status: AttendanceStatus): boolean {
  return status === 'PRESENT' || status === 'LATE';
}

/** One decimal place. Null when there is nothing to divide by. */
export function attendancePercentage(attended: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((attended * 1000) / total) / 10;
}

export type ClassAttendanceRecordInput = {
  studentCode: string;
  studentName: string;
  attendanceStatus: AttendanceStatus;
  createdAt: Date;
};

export type ClassAttendanceSessionInput = {
  status: SessionStatus;
  records: ClassAttendanceRecordInput[];
};

type StudentTally = {
  studentCode: string;
  studentName: string;
  lastSeenAt: number;
  attended: number;
  excused: number;
};

function remember(
  students: Map<string, StudentTally>,
  record: ClassAttendanceRecordInput,
): StudentTally {
  const seenAt = record.createdAt.getTime();
  const current = students.get(record.studentCode);
  if (!current) {
    const created: StudentTally = {
      studentCode: record.studentCode,
      studentName: record.studentName,
      lastSeenAt: seenAt,
      attended: 0,
      excused: 0,
    };
    students.set(record.studentCode, created);
    return created;
  }
  if (seenAt >= current.lastSeenAt) {
    current.lastSeenAt = seenAt;
    current.studentName = record.studentName;
  }
  return current;
}

/**
 * Students are every code that checked in to any session of the class.
 * Only CLOSED sessions are in the total. A missing record on a closed session counts as not attended.
 * Each student is counted at most once per session (the table is unique on session and code).
 */
export function summarizeClassAttendance(
  sessions: ClassAttendanceSessionInput[],
): ClassAttendanceDto {
  const students = new Map<string, StudentTally>();
  let closedSessionCount = 0;

  for (const session of sessions) {
    const closed = session.status === 'CLOSED';
    if (closed) closedSessionCount += 1;
    const counted = new Set<string>();
    for (const record of session.records) {
      const row = remember(students, record);
      if (!closed || counted.has(record.studentCode)) continue;
      counted.add(record.studentCode);
      if (countsAsAttended(record.attendanceStatus)) row.attended += 1;
      else if (record.attendanceStatus === 'EXCUSED') row.excused += 1;
    }
  }

  return {
    closedSessionCount,
    excusedCountsInDenominator: EXCUSED_COUNTS_IN_DENOMINATOR,
    students: [...students.values()]
      .map((row) => {
        const total = EXCUSED_COUNTS_IN_DENOMINATOR
          ? closedSessionCount
          : closedSessionCount - row.excused;
        return {
          studentCode: row.studentCode,
          studentName: row.studentName,
          attended: row.attended,
          total,
          percentage: attendancePercentage(row.attended, total),
        };
      })
      .sort((a, b) => a.studentCode.localeCompare(b.studentCode)),
  };
}

const attendanceSelect = {
  id: true,
  name: true,
  owner: {
    select: {
      displayName: true,
      university: true,
      faculty: true,
      career: true,
      printName: true,
    },
  },
  sessions: {
    select: {
      status: true,
      records: {
        select: {
          studentCode: true,
          studentName: true,
          attendanceStatus: true,
          createdAt: true,
        },
      },
    },
  },
} as const;

/** Owner filter for the class and for its sessions. One findFirst, no per-student queries. */
export function ownedClassAttendanceQuery(classId: string, ownerId: string) {
  return {
    where: { id: classId, ownerId },
    select: {
      ...attendanceSelect,
      sessions: {
        ...attendanceSelect.sessions,
        where: { instructorId: ownerId },
      },
    },
  } satisfies Prisma.ClassFindFirstArgs;
}
