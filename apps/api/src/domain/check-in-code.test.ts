import {
  CHECK_IN_CODE_ACCEPT_MS,
  CHECK_IN_CODE_GRACE_MS,
  CHECK_IN_CODE_TTL_MS,
  staleCheckInCodeMessage,
} from '@attendence-up/shared';
import { describe, expect, it } from 'vitest';
import {
  displayedPassIsCurrent,
  judgeCheckInCode,
  passExpiresAt,
  presentCheckInCode,
  selectDisplayedPass,
  type CheckInPass,
} from './check-in-code';

const issuedAt = new Date('2026-09-23T14:00:00.000Z');

function pass(overrides: Partial<CheckInPass> = {}): CheckInPass {
  return {
    code: 'code-a',
    issuedAt,
    expiresAt: passExpiresAt(issuedAt),
    ...overrides,
  };
}

describe('check-in code rotation', () => {
  it('keeps the on-screen code until the TTL elapses, then issues a new one', () => {
    const current = pass();
    const stillShowing = new Date(issuedAt.getTime() + CHECK_IN_CODE_TTL_MS - 1);
    const rotates = new Date(issuedAt.getTime() + CHECK_IN_CODE_TTL_MS);

    expect(displayedPassIsCurrent(current, stillShowing)).toBe(true);
    expect(selectDisplayedPass(current, stillShowing)).toBe('keep');
    expect(selectDisplayedPass(current, rotates)).toBe('issue');
    expect(selectDisplayedPass(null, issuedAt)).toBe('issue');
    expect(selectDisplayedPass(current, stillShowing, true)).toBe('issue');
  });

  it('accepts the code on screen and the one that just rotated off', () => {
    const current = pass();
    const onScreen = new Date(issuedAt.getTime() + 5_000);
    const justRotated = new Date(issuedAt.getTime() + CHECK_IN_CODE_TTL_MS + 1);
    const lastValidInstant = new Date(issuedAt.getTime() + CHECK_IN_CODE_ACCEPT_MS);
    const expired = new Date(lastValidInstant.getTime() + 1);

    expect(judgeCheckInCode(current, onScreen)).toEqual({ ok: true, freshness: 'current' });
    expect(judgeCheckInCode(current, justRotated)).toEqual({ ok: true, freshness: 'recent' });
    expect(judgeCheckInCode(current, lastValidInstant)).toEqual({ ok: true, freshness: 'recent' });
    expect(judgeCheckInCode(current, expired)).toEqual({ ok: false, reason: 'STALE' });
    expect(judgeCheckInCode(null, onScreen)).toEqual({ ok: false, reason: 'UNKNOWN' });
  });

  it('gives a scanned code the grace window after it leaves the screen', () => {
    expect(CHECK_IN_CODE_ACCEPT_MS).toBe(CHECK_IN_CODE_TTL_MS + CHECK_IN_CODE_GRACE_MS);
    expect(passExpiresAt(issuedAt).getTime() - issuedAt.getTime()).toBe(CHECK_IN_CODE_ACCEPT_MS);
  });

  it('builds the public attendance path with the stable token and the current code', () => {
    const dto = presentCheckInCode(pass({ code: 'abc def' }), 'token-123');
    expect(dto.publicPath).toBe('/attendance/token-123?c=abc%20def');
    expect(dto.rotatesAt).toBe(new Date(issuedAt.getTime() + CHECK_IN_CODE_TTL_MS).toISOString());
    expect(dto.expiresAt).toBe(passExpiresAt(issuedAt).toISOString());
    expect(dto.refreshSeconds).toBe(CHECK_IN_CODE_TTL_MS / 1000);
    expect(dto.graceSeconds).toBe(CHECK_IN_CODE_GRACE_MS / 1000);
    expect(staleCheckInCodeMessage()).toMatch(/expired/i);
  });
});
