import { randomBytes } from 'node:crypto';

/** 128-bit URL-safe token. Used for the stable public attendance id and for short-lived QR codes. */
export function createPublicToken(): string {
  return randomBytes(16).toString('base64url');
}
