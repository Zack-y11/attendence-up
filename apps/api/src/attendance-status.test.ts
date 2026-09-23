import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.CLERK_SECRET_KEY ??= 'sk_test_attendance_status';
  process.env.DATABASE_URL ??= 'postgresql://attendence:attendence@localhost:5434/attendence';
  process.env.LOG_LEVEL ??= 'silent';
});

const { findSession, findRecord, updateRecord } = vi.hoisted(() => ({
  findSession: vi.fn(),
  findRecord: vi.fn(),
  updateRecord: vi.fn(),
}));

vi.mock('./lib/prisma', () => ({
  prisma: {
    attendanceSession: { findFirst: findSession },
    attendanceRecord: { findFirst: findRecord, update: updateRecord },
    $disconnect: vi.fn(),
  },
  isUniqueConstraintError: () => false,
}));

vi.mock('./plugins/auth', () => ({
  requireInstructor: async (request: {
    instructor: { id: string; email: string; displayName: string; role: 'INSTRUCTOR' };
  }) => {
    request.instructor = {
      id: 'instructor-1',
      email: 'ada@example.edu',
      displayName: 'Ada Lovelace',
      role: 'INSTRUCTOR',
    };
  },
}));

const sessionId = '11111111-1111-4111-8111-111111111111';
const recordId = '22222222-2222-4222-8222-222222222222';

type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';

function storedRecord(attendanceStatus: AttendanceStatus = 'PRESENT') {
  return {
    id: recordId,
    sessionId,
    studentCode: 'SM001',
    studentName: 'Juan Pérez',
    signature: 'Juan',
    latitude: 13.69,
    longitude: -89.21,
    locationAccuracyMeters: 12,
    distanceFromSessionMeters: 40,
    locationStatus: 'WITHIN_RADIUS' as const,
    attendanceStatus,
    createdAt: new Date('2026-09-23T14:03:00.000Z'),
  };
}

describe('PATCH /api/sessions/:id/attendance/:recordId', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const { buildApp } = await import('./app');
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    findSession.mockReset();
    findRecord.mockReset();
    updateRecord.mockReset();
    findSession.mockResolvedValue({
      id: sessionId,
      status: 'CLOSED',
      class: null,
      _count: { records: 1 },
    });
    findRecord.mockResolvedValue(storedRecord());
    updateRecord.mockImplementation(
      async (args: { data: { attendanceStatus: AttendanceStatus } }) =>
        storedRecord(args.data.attendanceStatus),
    );
  });

  it.each(['LATE', 'EXCUSED', 'ABSENT', 'PRESENT'] as const)(
    'sets attendance status to %s on a closed session without rewriting the location',
    async (attendanceStatus) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/sessions/${sessionId}/attendance/${recordId}`,
        headers: { 'content-type': 'application/json' },
        payload: { attendanceStatus },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: recordId,
        studentCode: 'SM001',
        studentName: 'Juan Pérez',
        attendanceStatus,
        locationStatus: 'WITHIN_RADIUS',
        latitude: 13.69,
        longitude: -89.21,
        createdAt: '2026-09-23T14:03:00.000Z',
      });
      expect(findSession).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sessionId, instructorId: 'instructor-1' },
        }),
      );
      expect(findRecord).toHaveBeenCalledWith({
        where: { id: recordId, sessionId },
      });
      expect(updateRecord).toHaveBeenCalledWith({
        where: { id: recordId },
        data: { attendanceStatus },
      });
    },
  );

  it('returns 404 when the session belongs to another instructor', async () => {
    findSession.mockResolvedValue(null);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/sessions/${sessionId}/attendance/${recordId}`,
      headers: { 'content-type': 'application/json' },
      payload: { attendanceStatus: 'LATE' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: 'Session not found.' });
    expect(findRecord).not.toHaveBeenCalled();
    expect(updateRecord).not.toHaveBeenCalled();
  });

  it('returns 404 when the check-in is not in that session', async () => {
    findRecord.mockResolvedValue(null);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/sessions/${sessionId}/attendance/${recordId}`,
      headers: { 'content-type': 'application/json' },
      payload: { attendanceStatus: 'EXCUSED' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: 'Attendance record not found.' });
    expect(updateRecord).not.toHaveBeenCalled();
  });

  it('rejects an unknown attendance status', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/sessions/${sessionId}/attendance/${recordId}`,
      headers: { 'content-type': 'application/json' },
      payload: { attendanceStatus: 'TARDY' },
    });

    expect(response.statusCode).toBe(400);
    expect(updateRecord).not.toHaveBeenCalled();
  });
});
