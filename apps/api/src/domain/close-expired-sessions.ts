import { prisma } from '../lib/prisma';

/** The close instant itself still accepts check-in. The next moment does not. */
export function attendanceWindowEnded(closesAt: Date | null, now: Date): boolean {
  return closesAt != null && now > closesAt;
}

/** Open sessions whose check-in window has passed become closed. */
export async function closeExpiredSessions(
  where: { instructorId?: string; classId?: string; id?: string },
  now = new Date(),
): Promise<void> {
  await prisma.attendanceSession.updateMany({
    where: {
      ...where,
      status: 'OPEN',
      attendanceClosesAt: { lt: now },
    },
    data: { status: 'CLOSED' },
  });
}
