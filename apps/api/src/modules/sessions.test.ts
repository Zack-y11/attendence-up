import type { SessionDto } from '@attendence-up/shared';
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

const instructorA = `instructor-a-${crypto.randomUUID()}`;
const instructorB = `instructor-b-${crypto.randomUUID()}`;

let app!: FastifyInstance;

function call(
  userId: string,
  method: 'GET' | 'POST' | 'DELETE',
  url: string,
  body?: unknown,
): Promise<ApiResult> {
  return app.inject({
    method,
    url,
    headers: {
      'x-test-instructor': userId,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    payload: body === undefined ? undefined : JSON.stringify(body),
  }) as Promise<ApiResult>;
}

describe('session delete', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    await prisma.user.createMany({
      data: [
        { id: instructorA, email: `${instructorA}@example.test`, displayName: 'Instructor A' },
        { id: instructorB, email: `${instructorB}@example.test`, displayName: 'Instructor B' },
      ],
    });
    app = await buildApp();
  });

  afterAll(async () => {
    await prisma.attendanceSession.deleteMany({
      where: { instructorId: { in: [instructorA, instructorB] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [instructorA, instructorB] } } });
    await app?.close();
  });

  it('lets the owner delete an open session and its check-ins', async () => {
    const created = await call(instructorA, 'POST', '/api/sessions', { name: 'Week to remove' });
    expect(created.statusCode).toBe(201);
    const session = created.json<SessionDto>();

    await prisma.attendanceSession.update({
      where: { id: session.id },
      data: { status: 'OPEN' },
    });
    await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentCode: 'A1',
        studentName: 'Ana',
        locationStatus: 'NO_EXPECTED_LOCATION',
      },
    });

    expect((await call(instructorB, 'DELETE', `/api/sessions/${session.id}`)).statusCode).toBe(404);

    const removed = await call(instructorA, 'DELETE', `/api/sessions/${session.id}`);
    expect(removed.statusCode).toBe(204);
    expect((await call(instructorA, 'GET', `/api/sessions/${session.id}`)).statusCode).toBe(404);
    expect(await prisma.attendanceRecord.count({ where: { sessionId: session.id } })).toBe(0);
  });
});
