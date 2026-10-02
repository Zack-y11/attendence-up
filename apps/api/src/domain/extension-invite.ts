import { normalizeStudentCode } from '@attendence-up/shared';
import type { AttendanceExtensionInvite } from '@prisma/client';

export const DEFAULT_EXTENSION_MINUTES = 30;

export type ExtensionInviteFailure =
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'USED'
  | 'WRONG_SESSION'
  | 'CODE_MISMATCH';

export function extensionInviteActive(invite: AttendanceExtensionInvite, now: Date): boolean {
  return invite.usedAt == null && invite.expiresAt.getTime() > now.getTime();
}

export function validateExtensionInvite(
  invite: AttendanceExtensionInvite | null,
  sessionId: string,
  studentCode: string,
  now: Date,
): { ok: true } | { ok: false; reason: ExtensionInviteFailure } {
  if (!invite || invite.sessionId !== sessionId) {
    return { ok: false, reason: 'NOT_FOUND' };
  }
  if (invite.usedAt != null) return { ok: false, reason: 'USED' };
  if (invite.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: 'EXPIRED' };
  if (normalizeStudentCode(studentCode) !== invite.studentCode) {
    return { ok: false, reason: 'CODE_MISMATCH' };
  }
  return { ok: true };
}

export function extensionInviteMessage(reason: ExtensionInviteFailure): string {
  switch (reason) {
    case 'NOT_FOUND':
      return 'This extension link is not valid.';
    case 'EXPIRED':
      return 'This extension link has expired.';
    case 'USED':
      return 'This extension link was already used.';
    case 'WRONG_SESSION':
      return 'This extension link is not valid for this session.';
    case 'CODE_MISMATCH':
      return 'Use the student code this extension was created for.';
  }
}

export function extensionExpiresAt(now: Date, expiresInMinutes: number): Date {
  return new Date(now.getTime() + expiresInMinutes * 60_000);
}
