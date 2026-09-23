import { createPublicToken } from './tokens';
import {
  passExpiresAt,
  presentCheckInCode,
  selectDisplayedPass,
  type CheckInPass,
} from './check-in-code';
import { isUniqueConstraintError, prisma } from '../lib/prisma';

async function insertCode(sessionId: string, now: Date): Promise<CheckInPass> {
  const data = () => ({
    sessionId,
    code: createPublicToken(),
    issuedAt: now,
    expiresAt: passExpiresAt(now),
  });
  try {
    return await prisma.attendanceCheckInCode.create({ data: data() });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    return prisma.attendanceCheckInCode.create({ data: data() });
  }
}

/** Code currently shown on the live QR. Issues a new row when the TTL has elapsed or refresh is forced. */
export async function displayedCheckInCode(input: {
  sessionId: string;
  publicToken: string;
  now?: Date;
  force?: boolean;
}) {
  const now = input.now ?? new Date();
  await prisma.attendanceCheckInCode.deleteMany({
    where: { sessionId: input.sessionId, expiresAt: { lt: now } },
  });
  const latest = await prisma.attendanceCheckInCode.findFirst({
    where: { sessionId: input.sessionId },
    orderBy: { issuedAt: 'desc' },
  });
  const pass =
    selectDisplayedPass(latest, now, input.force ?? false) === 'keep' && latest
      ? latest
      : await insertCode(input.sessionId, now);
  return presentCheckInCode(pass, input.publicToken);
}

export async function findCheckInPass(sessionId: string, code: string) {
  return prisma.attendanceCheckInCode.findFirst({
    where: { sessionId, code },
  });
}
