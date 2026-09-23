import {
  CHECK_IN_CODE_ACCEPT_MS,
  CHECK_IN_CODE_GRACE_MS,
  CHECK_IN_CODE_TTL_MS,
  checkInPublicPath,
  type CheckInCodeDto,
} from '@attendence-up/shared';

export type CheckInPass = {
  code: string;
  issuedAt: Date;
  expiresAt: Date;
};

export type CheckInCodeVerdict =
  { ok: true; freshness: 'current' | 'recent' } | { ok: false; reason: 'UNKNOWN' | 'STALE' };

export function passExpiresAt(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + CHECK_IN_CODE_ACCEPT_MS);
}

export function passRotatesAt(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + CHECK_IN_CODE_TTL_MS);
}

/** The code still on screen. Once the TTL elapses the live view issues a new one. */
export function displayedPassIsCurrent(pass: CheckInPass | null, now: Date): boolean {
  if (!pass) return false;
  return (
    now.getTime() < pass.issuedAt.getTime() + CHECK_IN_CODE_TTL_MS &&
    now.getTime() <= pass.expiresAt.getTime()
  );
}

export function selectDisplayedPass(
  latest: CheckInPass | null,
  now: Date,
  force = false,
): 'keep' | 'issue' {
  if (force || !displayedPassIsCurrent(latest, now)) return 'issue';
  return 'keep';
}

/**
 * A code checks in while it is on screen (`current`) or during the grace window
 * after it rotates off (`recent`). Older codes are stale.
 */
export function judgeCheckInCode(pass: CheckInPass | null, now: Date): CheckInCodeVerdict {
  if (!pass) return { ok: false, reason: 'UNKNOWN' };
  if (now.getTime() > pass.expiresAt.getTime()) return { ok: false, reason: 'STALE' };
  const onScreen = now.getTime() < pass.issuedAt.getTime() + CHECK_IN_CODE_TTL_MS;
  return { ok: true, freshness: onScreen ? 'current' : 'recent' };
}

export function presentCheckInCode(pass: CheckInPass, publicToken: string): CheckInCodeDto {
  return {
    code: pass.code,
    issuedAt: pass.issuedAt.toISOString(),
    expiresAt: pass.expiresAt.toISOString(),
    rotatesAt: passRotatesAt(pass.issuedAt).toISOString(),
    publicPath: checkInPublicPath(publicToken, pass.code),
    refreshSeconds: CHECK_IN_CODE_TTL_MS / 1000,
    graceSeconds: CHECK_IN_CODE_GRACE_MS / 1000,
  };
}
