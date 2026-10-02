import type {
  AttendanceExtensionInviteDto,
  PublicSessionDto,
  SessionDto,
} from '@attendence-up/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPublicToken } from '../domain/tokens';

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

const instructor = `instructor-ext-${crypto.randomUUID()}`;

let app!: FastifyInstance;

function instructorCall(
  method: 'GET' | 'POST' | 'DELETE',
  url: string,
  body?: unknown,
): Promise<ApiResult> {
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

function checkIn(publicToken: string, body: { studentCode: string; studentName: string }, e?: string) {
  const query = e ? `?e=${encodeURIComponent(e)}` : '';
  return app.inject({
    method: 'POST',
    url: `/api/public/sessions/${publicToken}/attendance${query}`,
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify(body),
  });
}

describe('attendance extension invites', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    await prisma.user.create({
      data: {
        id: instructor,
        email: `${instructor}@example.test`,
        displayName: 'Extension instructor',
      },
    });
    app = await buildApp();
  });

  afterAll(async () => {
    await prisma.attendanceExtensionInvite.deleteMany({
      where: { session: { instructorId: instructor } },
    });
    await prisma.attendanceSession.deleteMany({ where: { instructorId: instructor } });
    await prisma.user.deleteMany({ where: { id: instructor } });
    await app?.close();
  });

  it('rejects public check-in on a closed session without an extension', async () => {
    const created = await instructorCall('POST', '/api/sessions', { name: 'Closed for ext test' });
    const session = created.json<SessionDto>();
    await prisma.attendanceSession.update({
      where: { id: session.id },
      data: { status: 'CLOSED' },
    });

    const denied = await checkIn(session.publicToken, {
      studentCode: 'EXT001',
      studentName: 'Late Student',
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json<{ code: string }>().code).toBe('NOT_OPEN');
  });

  it(
    'creates an invite and accepts one late check-in while the session stays closed for others',
    async () => {
    const created = await instructorCall('POST', '/api/sessions', { name: 'Extension session' });
    const session = created.json<SessionDto>();
    await prisma.attendanceSession.update({
      where: { id: session.id },
      data: { status: 'CLOSED' },
    });

    const inviteRes = await instructorCall('POST', `/api/sessions/${session.id}/extensions`, {
      studentCode: 'ext001',
    });
    expect(inviteRes.statusCode).toBe(201);
    const invite = inviteRes.json<AttendanceExtensionInviteDto>();
    expect(invite.studentCode).toBe('EXT001');
    expect(invite.publicPath).toContain('?e=');

    const extensionToken = invite.publicPath.split('?e=')[1] ?? '';

    const pubClosed = await app.inject({
      method: 'GET',
      url: `/api/public/sessions/${session.publicToken}`,
    });
    expect(pubClosed.json<PublicSessionDto>()).toMatchObject({
      acceptingAttendance: false,
      closedReason: 'NOT_OPEN',
    });

    const pubExt = await app.inject({
      method: 'GET',
      url: `/api/public/sessions/${session.publicToken}?e=${encodeURIComponent(extensionToken)}`,
    });
    expect(pubExt.json<PublicSessionDto>()).toMatchObject({
      acceptingAttendance: true,
      extensionCheckIn: true,
    });

    const ok = await checkIn(
      session.publicToken,
      { studentCode: 'EXT001', studentName: 'Late Student' },
      extensionToken,
    );
    expect(ok.statusCode).toBe(201);

    const record = await prisma.attendanceRecord.findUnique({
      where: { sessionId_studentCode: { sessionId: session.id, studentCode: 'EXT001' } },
    });
    expect(record?.attendanceStatus).toBe('LATE');

    const reused = await checkIn(
      session.publicToken,
      { studentCode: 'EXT001', studentName: 'Late Student' },
      extensionToken,
    );
    expect(reused.statusCode).toBe(403);
    expect(reused.json<{ code: string }>().code).toBe('EXTENSION_USED');

    const stillClosed = await checkIn(session.publicToken, {
      studentCode: 'EXT002',
      studentName: 'Other',
    });
    expect(stillClosed.statusCode).toBe(403);
    },
    30_000,
  );

  it(
    'rejects wrong student code, expired invite, and duplicate invite for enrolled student',
    async () => {
    const created = await instructorCall('POST', '/api/sessions', { name: 'Extension rules' });
    const session = created.json<SessionDto>();
    await prisma.attendanceSession.update({
      where: { id: session.id },
      data: { status: 'CLOSED' },
    });

    await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentCode: 'HAS001',
        studentName: 'Already in',
        locationStatus: 'NO_EXPECTED_LOCATION',
      },
    });

    const dupInvite = await instructorCall('POST', `/api/sessions/${session.id}/extensions`, {
      studentCode: 'HAS001',
    });
    expect(dupInvite.statusCode).toBe(409);
    expect(dupInvite.json<{ code: string }>().code).toBe('DUPLICATE_ATTENDANCE');

    const inviteRes = await instructorCall('POST', `/api/sessions/${session.id}/extensions`, {
      studentCode: 'RULE001',
    });
    const invite = inviteRes.json<AttendanceExtensionInviteDto>();
    const extensionToken = invite.publicPath.split('?e=')[1] ?? '';

    const wrongCode = await checkIn(
      session.publicToken,
      { studentCode: 'OTHER', studentName: 'Wrong' },
      extensionToken,
    );
    expect(wrongCode.statusCode).toBe(403);
    expect(wrongCode.json<{ code: string }>().code).toBe('EXTENSION_CODE_MISMATCH');

    await prisma.attendanceExtensionInvite.update({
      where: { id: invite.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const expired = await checkIn(
      session.publicToken,
      { studentCode: 'RULE001', studentName: 'Too late' },
      extensionToken,
    );
    expect(expired.statusCode).toBe(403);
    expect(expired.json<{ code: string }>().code).toBe('EXTENSION_EXPIRED');
    },
    30_000,
  );

  it('lists and revokes unused invites', async () => {
    const created = await instructorCall('POST', '/api/sessions', { name: 'Revoke test' });
    const session = created.json<SessionDto>();

    const inviteRes = await instructorCall('POST', `/api/sessions/${session.id}/extensions`, {
      studentCode: 'REV001',
    });
    const invite = inviteRes.json<AttendanceExtensionInviteDto>();

    const list = await instructorCall('GET', `/api/sessions/${session.id}/extensions`);
    expect(list.statusCode).toBe(200);
    expect(list.json<AttendanceExtensionInviteDto[]>().some((row) => row.id === invite.id)).toBe(
      true,
    );

    const revoked = await instructorCall(
      'DELETE',
      `/api/sessions/${session.id}/extensions/${invite.id}`,
    );
    expect(revoked.statusCode).toBe(204);

    const after = await checkIn(
      session.publicToken,
      { studentCode: 'REV001', studentName: 'Revoked' },
      invite.publicPath.split('?e=')[1],
    );
    expect(after.statusCode).toBe(403);
    expect(after.json<{ code: string }>().code).toBe('EXTENSION_NOT_FOUND');
  });

  it('ignores forged extension tokens', async () => {
    const created = await instructorCall('POST', '/api/sessions', { name: 'Forged token' });
    const session = created.json<SessionDto>();
    await prisma.attendanceSession.update({
      where: { id: session.id },
      data: { status: 'CLOSED' },
    });

    const forged = createPublicToken();
    const denied = await checkIn(
      session.publicToken,
      { studentCode: 'FORGE1', studentName: 'Forged' },
      forged,
    );
    expect(denied.statusCode).toBe(403);
    expect(denied.json<{ code: string }>().code).toBe('EXTENSION_NOT_FOUND');
  });
});
