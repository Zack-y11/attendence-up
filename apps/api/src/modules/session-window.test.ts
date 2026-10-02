import type { PublicSessionDto, SessionDto } from '@attendence-up/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

type ApiResult = {
  statusCode: number;
  json: <T>() => T;
};

vi.mock('../plugins/auth', async () => {
  const { AppError } = await import('../lib/errors');
  return {
    requireInstructor: async (request: {
      headers: Record<string, string | string[] | undefined>;
      instructor: { id: string; email: string; displayName: string; role: 'INSTRUCTOR' };
    }) => {
      const header = request.headers['x-test-instructor'];
      const id = Array.isArray(header) ? header[0] : header;
      if (!id) throw new AppError(401, 'Sign in required.', 'UNAUTHENTICATED');
      request.instructor = {
        id,
        email: `${id}@example.test`,
        displayName: id,
        role: 'INSTRUCTOR',
      };
    },
  };
});

const { buildApp } = await import('../app');
const { prisma } = await import('../lib/prisma');

const instructor = `instructor-window-${crypto.randomUUID()}`;

let app!: FastifyInstance;

function call(method: 'GET' | 'POST' | 'PATCH', url: string, body?: unknown): Promise<ApiResult> {
  return app.inject({
    method,
    url,
    headers: {
      'x-test-instructor': instructor,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    payload: body === undefined ? undefined : JSON.stringify(body),
  }) as Promise<ApiResult>;
}

function iso(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

describe('scheduled attendance window', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    await prisma.user.create({
      data: {
        id: instructor,
        email: `${instructor}@example.test`,
        displayName: 'Window instructor',
      },
    });
    app = await buildApp();
  });

  afterAll(async () => {
    await prisma.attendanceSession.deleteMany({ where: { instructorId: instructor } });
    await prisma.user.deleteMany({ where: { id: instructor } });
    await app?.close();
  });

  it('is closed before the start and the public link rejects check-in', async () => {
    const created = await call('POST', '/api/sessions', {
      name: 'Before start',
      attendanceOpensAt: iso(60_000),
      attendanceClosesAt: iso(120_000),
    });
    expect(created.statusCode).toBe(201);
    const session = created.json<SessionDto>();
    expect(session.status).toBe('CLOSED');

    const loaded = await call('GET', `/api/sessions/${session.id}`);
    expect(loaded.json<SessionDto>().status).toBe('CLOSED');

    const pub = await app.inject({
      method: 'GET',
      url: `/api/public/sessions/${session.publicToken}`,
    });
    expect(pub.statusCode).toBe(200);
    expect(pub.json<PublicSessionDto>()).toMatchObject({
      status: 'CLOSED',
      acceptingAttendance: false,
      closedReason: 'TOO_EARLY',
    });

    const checkIn = await app.inject({
      method: 'POST',
      url: `/api/public/sessions/${session.publicToken}/attendance`,
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ studentCode: 'SM001', studentName: 'Ana' }),
    });
    expect(checkIn.statusCode).toBe(403);
    expect(checkIn.json<{ code: string }>().code).toBe('TOO_EARLY');
  });

  it('is open at the start without a button click and the public link accepts check-in', async () => {
    const created = await call('POST', '/api/sessions', {
      name: 'During window',
      attendanceOpensAt: iso(-60_000),
      attendanceClosesAt: iso(60_000),
    });
    const session = created.json<SessionDto>();
    expect(created.statusCode).toBe(201);
    expect(session.status).toBe('OPEN');

    const pub = await app.inject({
      method: 'GET',
      url: `/api/public/sessions/${session.publicToken}`,
    });
    expect(pub.json<PublicSessionDto>()).toMatchObject({
      status: 'OPEN',
      acceptingAttendance: true,
      closedReason: null,
    });

    const checkIn = await app.inject({
      method: 'POST',
      url: `/api/public/sessions/${session.publicToken}/attendance`,
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ studentCode: 'SM001', studentName: 'Ana' }),
    });
    expect(checkIn.statusCode).toBe(201);
  });

  it('is closed at the end and the public link rejects check-in', async () => {
    const created = await call('POST', '/api/sessions', {
      name: 'Ended window',
      attendanceOpensAt: iso(-120_000),
      attendanceClosesAt: iso(-1_000),
    });
    const session = created.json<SessionDto>();
    expect(session.status).toBe('CLOSED');

    const pub = await app.inject({
      method: 'GET',
      url: `/api/public/sessions/${session.publicToken}`,
    });
    expect(pub.json<PublicSessionDto>()).toMatchObject({
      status: 'CLOSED',
      acceptingAttendance: false,
      closedReason: 'TOO_LATE',
    });

    const checkIn = await app.inject({
      method: 'POST',
      url: `/api/public/sessions/${session.publicToken}/attendance`,
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ studentCode: 'SM001', studentName: 'Ana' }),
    });
    expect(checkIn.statusCode).toBe(403);
    expect(checkIn.json<{ code: string }>().code).toBe('TOO_LATE');
  });

  it('opens for a later window and closes at the new end', async () => {
    const created = await call('POST', '/api/sessions', {
      name: 'Move the window',
      attendanceOpensAt: iso(-120_000),
      attendanceClosesAt: iso(-60_000),
    });
    const session = created.json<SessionDto>();
    expect(session.status).toBe('CLOSED');

    const reopened = await call('PATCH', `/api/sessions/${session.id}`, {
      attendanceOpensAt: iso(-5_000),
      attendanceClosesAt: iso(300_000),
    });
    expect(reopened.statusCode).toBe(200);
    expect(reopened.json<SessionDto>().status).toBe('OPEN');

    const during = await app.inject({
      method: 'GET',
      url: `/api/public/sessions/${session.publicToken}`,
    });
    expect(during.json<PublicSessionDto>().acceptingAttendance).toBe(true);

    const closed = await call('PATCH', `/api/sessions/${session.id}`, {
      attendanceClosesAt: iso(-1_000),
    });
    expect(closed.statusCode).toBe(200);
    expect(closed.json<SessionDto>().status).toBe('CLOSED');

    const after = await app.inject({
      method: 'POST',
      url: `/api/public/sessions/${session.publicToken}/attendance`,
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ studentCode: 'SM002', studentName: 'Luis' }),
    });
    expect(after.statusCode).toBe(403);
    expect(after.json<{ code: string }>().code).toBe('TOO_LATE');
  });
});
