import { randomBytes } from 'node:crypto';

/** 128-bit URL-safe token. This is the public attendance identifier and a future QR payload. */
export function createPublicToken(): string {
  return randomBytes(16).toString('base64url');
}
