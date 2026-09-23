/** How long the live QR keeps showing one code before the screen rotates. */
export const CHECK_IN_CODE_TTL_MS = 30_000;

/**
 * After a code leaves the screen it still checks in for this long, so a student
 * who just scanned can finish the form.
 */
export const CHECK_IN_CODE_GRACE_MS = 60_000;

export const CHECK_IN_CODE_ACCEPT_MS = CHECK_IN_CODE_TTL_MS + CHECK_IN_CODE_GRACE_MS;

export const CHECK_IN_CODE_STATUSES = ['VALID', 'EXPIRED', 'ABSENT'] as const;
export type CheckInCodeStatus = (typeof CHECK_IN_CODE_STATUSES)[number];

export function missingCheckInCodeMessage(): string {
  return 'Scan the QR code on the screen to check in.';
}

export function staleCheckInCodeMessage(): string {
  return 'This QR code has expired. Scan the code on the screen again.';
}

/** Public check-in path: the stable session token plus the current short-lived code. */
export function checkInPublicPath(publicToken: string, code: string): string {
  return `/attendance/${publicToken}?c=${encodeURIComponent(code)}`;
}
