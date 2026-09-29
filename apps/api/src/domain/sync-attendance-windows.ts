import type { SessionStatus } from '@attendence-up/shared';
import { prisma } from '../lib/prisma';
import { nextStoredStatus } from './session-schedule';

/** Apply the check-in window on read. There is no background job. */
export async function syncAttendanceWindows(
  where: { instructorId?: string; classId?: string; id?: string },
  now = new Date(),
): Promise<void> {
  const sessions = await prisma.attendanceSession.findMany({
    where,
    select: { id: true, status: true, attendanceOpensAt: true, attendanceClosesAt: true },
  });
  const groups = new Map<SessionStatus, string[]>();
  for (const session of sessions) {
    const next = nextStoredStatus(
      session.status,
      session.attendanceOpensAt,
      session.attendanceClosesAt,
      now,
    );
    if (next === session.status) continue;
    const ids = groups.get(next) ?? [];
    ids.push(session.id);
    groups.set(next, ids);
  }
  await Promise.all(
    [...groups.entries()].map(([status, ids]) =>
      prisma.attendanceSession.updateMany({ where: { id: { in: ids } }, data: { status } }),
    ),
  );
}
