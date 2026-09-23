import { CHECK_IN_CODE_TTL_MS } from '@attendence-up/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { displayedCheckInCode } from './check-in-codes';

const db = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    attendanceCheckInCode: {
      deleteMany: db.deleteMany,
      findFirst: db.findFirst,
      create: db.create,
    },
  },
  isUniqueConstraintError: () => false,
}));

const now = new Date('2026-09-23T14:00:00.000Z');

describe('displayedCheckInCode', () => {
  beforeEach(() => {
    db.deleteMany.mockReset();
    db.findFirst.mockReset();
    db.create.mockReset();
    db.deleteMany.mockResolvedValue({ count: 0 });
    db.create.mockImplementation(
      async ({ data }: { data: { code: string; issuedAt: Date; expiresAt: Date } }) => ({
        id: 'new-code',
        sessionId: 'session-1',
        ...data,
      }),
    );
  });

  it('issues a code when the session has none', async () => {
    db.findFirst.mockResolvedValue(null);
    const dto = await displayedCheckInCode({
      sessionId: 'session-1',
      publicToken: 'token-1234567890abcd',
      now,
    });

    expect(dto.publicPath).toBe(
      `/attendance/token-1234567890abcd?c=${encodeURIComponent(dto.code)}`,
    );
    expect(dto.rotatesAt).toBe(new Date(now.getTime() + CHECK_IN_CODE_TTL_MS).toISOString());
    expect(db.create).toHaveBeenCalledOnce();
  });

  it('reuses the on-screen code and rotates once the TTL elapses', async () => {
    const current = {
      id: 'code-1',
      sessionId: 'session-1',
      code: 'still-current',
      issuedAt: new Date(now.getTime() - 5_000),
      expiresAt: new Date(now.getTime() + 85_000),
    };
    db.findFirst.mockResolvedValue(current);

    const kept = await displayedCheckInCode({
      sessionId: 'session-1',
      publicToken: 'token-1234567890abcd',
      now,
    });
    expect(kept.code).toBe('still-current');
    expect(db.create).not.toHaveBeenCalled();

    db.findFirst.mockResolvedValue({
      ...current,
      code: 'rotated-off',
      issuedAt: new Date(now.getTime() - CHECK_IN_CODE_TTL_MS),
      expiresAt: new Date(now.getTime() + 60_000),
    });
    const rotated = await displayedCheckInCode({
      sessionId: 'session-1',
      publicToken: 'token-1234567890abcd',
      now,
    });
    expect(rotated.code).not.toBe('rotated-off');
    expect(db.create).toHaveBeenCalledOnce();
  });

  it('issues a new code immediately when refresh is forced, leaving the previous one stored', async () => {
    db.findFirst.mockResolvedValue({
      id: 'code-1',
      sessionId: 'session-1',
      code: 'on-screen',
      issuedAt: new Date(now.getTime() - 1_000),
      expiresAt: new Date(now.getTime() + 89_000),
    });

    const refreshed = await displayedCheckInCode({
      sessionId: 'session-1',
      publicToken: 'token-1234567890abcd',
      now,
      force: true,
    });

    expect(refreshed.code).not.toBe('on-screen');
    expect(db.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: 'session-1', expiresAt: { lt: now } },
    });
    expect(db.create).toHaveBeenCalledOnce();
  });
});
