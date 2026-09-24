import { prisma } from '../lib/prisma';

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
