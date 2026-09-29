import { normalizeStudentCode } from '@attendence-up/shared';
import { prisma } from '../lib/prisma';

/**
 * Name saved for one exact student code in one class.
 * A student is the code on that class's attendance rows. The name is the latest
 * of those rows. No separate student table: session delete drops its rows, and
 * the next latest name remains. Equality only — never a prefix or a list.
 */
export async function lookupSavedStudentName(
  classId: string | null,
  studentCode: string,
): Promise<string | null> {
  if (!classId) return null;
  const record = await prisma.attendanceRecord.findFirst({
    where: {
      studentCode: normalizeStudentCode(studentCode),
      session: { classId },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { studentName: true },
  });
  return record?.studentName ?? null;
}
