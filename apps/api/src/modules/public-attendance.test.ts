import { missingCheckInCodeMessage, staleCheckInCodeMessage } from '@attendence-up/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findCode: vi.fn(),
  createRecord: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    attendanceSession: { findUnique: db.findUnique },
    attendanceCheckInCode: { findFirst: db.findCode },
    attendanceRecord: { create: db.createRecord },
    $disconnect: vi.fn(),
  },
  isUniqueConstraintError: () => false,
}));

const token = 'token-1234567890abcd';
const now = Date.now();

const session = {
  id: 'session-1',
  publicToken: token,
  classId: null,
  instructorId: 'instructor-1',
  name: 'Lecture',
  description: '',
  status: 'OPEN' as const,
  startsAt: null,
  endsAt: null,
  attendanceOpensAt: null,
  attendanceClosesAt: null,
  locationLatitude: 13.7,
  locationLongitude: -89.2,
  locationRadiusMeters: 100,
  createdAt: new Date(now),
  updatedAt: new Date(now),
  class: null,
};

function pass(code: string, issuedAgoMs: number, expiresInMs: number) {
  return {
    id: `pass-${code}`,
    sessionId: session.id,
    code,
    issuedAt: new Date(now - issuedAgoMs),
    expiresAt: new Date(now + expiresInMs),
  };
}

const passes = [
  pass('current-code', 1_000, 80_000),
  pass('recent-code', 45_000, 45_000),
  pass('stale-code', 120_000, -5_000),
  { ...pass('other-session-code', 1_000, 80_000), sessionId: 'session-2' },
];

const body = {
  studentCode: 'sm001',
  studentName: 'Ada Lovelace',
  latitude: 0,
  longitude: 0,
  locationAccuracyMeters: 8,
};

async function post(app: FastifyInstance, checkInCode?: string) {
  return app.inject({
    method: 'POST',
    url: `/api/public/sessions/${token}/attendance`,
    payload: checkInCode === undefined ? { ...body } : { ...body, checkInCode },
  });
}

describe('public check-in codes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const { buildApp } = await import('../app');
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    db.findUnique.mockReset();
    db.findCode.mockReset();
    db.createRecord.mockReset();
    db.findUnique.mockImplementation(async ({ where }: { where: { publicToken: string } }) =>
      where.publicToken === token ? session : null,
    );
    db.findCode.mockImplementation(
      async ({ where }: { where: { sessionId: string; code: string } }) => {
        return (
          passes.find((item) => item.sessionId === where.sessionId && item.code === where.code) ??
          null
        );
      },
    );
    db.createRecord.mockImplementation(
      async ({ data }: { data: { studentCode: string; studentName: string } }) => ({
        id: 'record-1',
        studentCode: data.studentCode,
        studentName: data.studentName,
        createdAt: new Date(now),
      }),
    );
  });

  it('checks in with the current code and still accepts a far location reading', async () => {
    const response = await post(app, 'current-code');
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ studentCode: 'SM001', studentName: 'Ada Lovelace' });
    expect(db.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          latitude: 0,
          longitude: 0,
          locationStatus: 'OUTSIDE_RADIUS',
        }),
      }),
    );
  });

  it('checks in with a code that has rotated off the screen but is still inside the grace window', async () => {
    const response = await post(app, 'recent-code');
    expect(response.statusCode).toBe(201);
    expect(db.createRecord).toHaveBeenCalledOnce();
  });

  it('accepts a check-in with no location reading', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/public/sessions/${token}/attendance`,
      payload: { studentCode: 'SM002', studentName: 'Grace Hopper', checkInCode: 'current-code' },
    });
    expect(response.statusCode).toBe(201);
    expect(db.createRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ locationStatus: 'LOCATION_UNAVAILABLE' }),
      }),
    );
  });

  it('rejects a stale code, an unknown code, a code from another session, and a missing code', async () => {
    const stale = await post(app, 'stale-code');
    const unknown = await post(app, 'not-a-real-code');
    const otherSession = await post(app, 'other-session-code');
    const missing = await post(app);

    expect(stale.statusCode).toBe(403);
    expect(stale.json()).toMatchObject({
      error: staleCheckInCodeMessage(),
      code: 'STALE_CHECK_IN_CODE',
    });
    expect(unknown.json()).toMatchObject({
      error: staleCheckInCodeMessage(),
      code: 'STALE_CHECK_IN_CODE',
    });
    expect(otherSession.json()).toMatchObject({
      error: staleCheckInCodeMessage(),
      code: 'STALE_CHECK_IN_CODE',
    });
    expect(missing.statusCode).toBe(403);
    expect(missing.json()).toMatchObject({
      error: missingCheckInCodeMessage(),
      code: 'MISSING_CHECK_IN_CODE',
    });
    expect(db.createRecord).not.toHaveBeenCalled();
  });

  it('still rejects a closed session before it considers the check-in code', async () => {
    db.findUnique.mockResolvedValue({ ...session, status: 'CLOSED' });
    const response = await post(app, 'current-code');
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'NOT_OPEN' });
    expect(db.createRecord).not.toHaveBeenCalled();
  });

  it('reports the code status on the public session page', async () => {
    const current = await app.inject({
      method: 'GET',
      url: `/api/public/sessions/${token}?c=current-code`,
    });
    const recent = await app.inject({
      method: 'GET',
      url: `/api/public/sessions/${token}?c=recent-code`,
    });
    const stale = await app.inject({
      method: 'GET',
      url: `/api/public/sessions/${token}?c=stale-code`,
    });
    const absent = await app.inject({ method: 'GET', url: `/api/public/sessions/${token}` });

    expect(current.json()).toMatchObject({ acceptingAttendance: true, checkInCodeStatus: 'VALID' });
    expect(recent.json()).toMatchObject({ checkInCodeStatus: 'VALID' });
    expect(stale.json()).toMatchObject({ checkInCodeStatus: 'EXPIRED' });
    expect(absent.json()).toMatchObject({ checkInCodeStatus: 'ABSENT' });
  });
});
