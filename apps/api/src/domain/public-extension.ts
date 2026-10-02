import type { AttendanceExtensionInvite } from '@prisma/client';
import { extensionInviteActive } from './extension-invite';
import { prisma } from '../lib/prisma';

export async function findExtensionInviteForSession(
  extensionToken: string | undefined,
  sessionId: string,
  now: Date,
): Promise<AttendanceExtensionInvite | null> {
  if (!extensionToken) return null;
  const invite = await prisma.attendanceExtensionInvite.findUnique({
    where: { token: extensionToken },
  });
  if (!invite || invite.sessionId !== sessionId) return null;
  if (!extensionInviteActive(invite, now)) return null;
  return invite;
}
