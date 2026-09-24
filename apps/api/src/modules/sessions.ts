import {
  attendanceRecordParamSchema,
  duplicateSessionSchema,
  idParamSchema,
  sessionListQuerySchema,
  sessionWriteSchema,
  updateAttendanceRecordSchema,
  updateSessionSchema,
} from '@attendence-up/shared';
import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AppError } from '../lib/errors';
import { dateColumns, presentRecord, presentSession, sessionLocationColumns } from '../lib/presenters';
import { prisma } from '../lib/prisma';
import { closeExpiredSessions } from '../domain/close-expired-sessions';
import { attendanceWindowEnded } from '../domain/attendance-gate';
import { createPublicToken } from '../domain/tokens';

function shiftByDays(value: Date | null, days: number): Date | null {
  if (!value || days === 0) return value;
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

const sessionInclude = {
  class: { select: { name: true, startsAt: true, endsAt: true } },
  _count: { select: { records: true } },
} as const;

async function ownedSession(id: string, instructorId: string) {
  await closeExpiredSessions({ id, instructorId });
  const session = await prisma.attendanceSession.findFirst({
    where: { id, instructorId },
    include: sessionInclude,
  });
  if (!session) throw new AppError(404, 'Session not found.');
  return session;
}

export async function sessionRoutes(app: FastifyInstance) {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get('/sessions', { schema: { querystring: sessionListQuerySchema } }, async (request) => {
    const scope = request.query.scope ?? 'all';
    await closeExpiredSessions({ instructorId: request.instructor.id });
    const where: Prisma.AttendanceSessionWhereInput = { instructorId: request.instructor.id };
    if (scope === 'open') where.status = 'OPEN';
    if (scope === 'draft') where.status = 'DRAFT';
    if (scope === 'closed') where.status = 'CLOSED';
    const sessions = await prisma.attendanceSession.findMany({
      where,
      include: sessionInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return sessions.map(presentSession);
  });

  api.post('/sessions', { schema: { body: sessionWriteSchema } }, async (request, reply) => {
    const created = await prisma.attendanceSession.create({
      data: {
        publicToken: createPublicToken(),
        instructorId: request.instructor.id,
        name: request.body.name,
        description: request.body.description ?? '',
        ...dateColumns(request.body),
        ...sessionLocationColumns(request.body.location ?? null),
      },
      include: sessionInclude,
    });
    return reply.status(201).send(presentSession(created));
  });

  api.get('/sessions/:id', { schema: { params: idParamSchema } }, async (request) => {
    return presentSession(await ownedSession(request.params.id, request.instructor.id));
  });

  api.post(
    '/sessions/:id/duplicate',
    { schema: { params: idParamSchema, body: duplicateSessionSchema } },
    async (request, reply) => {
      const session = await ownedSession(request.params.id, request.instructor.id);
      if (session.classId) {
        const course = await prisma.class.findFirst({
          where: { id: session.classId, ownerId: request.instructor.id },
        });
        if (!course) throw new AppError(404, 'Class not found.');
        if (course.status === 'ARCHIVED') {
          throw new AppError(409, 'Archived classes cannot accept new sessions.');
        }
      }
      const shiftDays = request.body.shiftDays ?? 0;
      const created = await prisma.attendanceSession.create({
        data: {
          publicToken: createPublicToken(),
          classId: session.classId,
          instructorId: request.instructor.id,
          name: session.name,
          description: session.description,
          attendanceOpensAt: shiftByDays(session.attendanceOpensAt, shiftDays),
          attendanceClosesAt: shiftByDays(session.attendanceClosesAt, shiftDays),
          locationLatitude: session.locationLatitude,
          locationLongitude: session.locationLongitude,
          locationRadiusMeters: session.locationRadiusMeters,
        },
        include: sessionInclude,
      });
      return reply.status(201).send(presentSession(created));
    },
  );

  api.patch(
    '/sessions/:id',
    { schema: { params: idParamSchema, body: updateSessionSchema } },
    async (request) => {
      const session = await ownedSession(request.params.id, request.instructor.id);
      const updated = await prisma.attendanceSession.update({
        where: { id: session.id },
        data: {
          ...(request.body.name !== undefined ? { name: request.body.name } : {}),
          ...(request.body.description !== undefined ? { description: request.body.description } : {}),
          ...dateColumns(request.body),
          ...sessionLocationColumns(request.body.location),
        },
        include: sessionInclude,
      });
      return presentSession(updated);
    },
  );

  api.post('/sessions/:id/open', { schema: { params: idParamSchema } }, async (request) => {
    const session = await ownedSession(request.params.id, request.instructor.id);
    if (session.status === 'OPEN') return presentSession(session);
    if (session.status !== 'DRAFT') {
      throw new AppError(409, 'Only a draft session can be opened. Reopen a closed session instead.');
    }
    if (attendanceWindowEnded(session.attendanceClosesAt, new Date())) {
      throw new AppError(409, 'The attendance window has closed.');
    }
    const updated = await prisma.attendanceSession.update({
      where: { id: session.id },
      data: { status: 'OPEN' },
      include: sessionInclude,
    });
    return presentSession(updated);
  });

  api.post('/sessions/:id/close', { schema: { params: idParamSchema } }, async (request) => {
    const session = await ownedSession(request.params.id, request.instructor.id);
    if (session.status === 'CLOSED') return presentSession(session);
    if (session.status !== 'OPEN') {
      throw new AppError(409, 'Open the session before closing it.');
    }
    const updated = await prisma.attendanceSession.update({
      where: { id: session.id },
      data: { status: 'CLOSED' },
      include: sessionInclude,
    });
    return presentSession(updated);
  });

  api.post('/sessions/:id/reopen', { schema: { params: idParamSchema } }, async (request) => {
    const session = await ownedSession(request.params.id, request.instructor.id);
    if (session.status === 'OPEN') return presentSession(session);
    if (session.status !== 'CLOSED') {
      throw new AppError(409, 'Only a closed session can be reopened.');
    }
    if (attendanceWindowEnded(session.attendanceClosesAt, new Date())) {
      throw new AppError(409, 'The attendance window has closed.');
    }
    const updated = await prisma.attendanceSession.update({
      where: { id: session.id },
      data: { status: 'OPEN' },
      include: sessionInclude,
    });
    return presentSession(updated);
  });

  api.delete('/sessions/:id', { schema: { params: idParamSchema } }, async (request, reply) => {
    const session = await ownedSession(request.params.id, request.instructor.id);
    if (session.status !== 'DRAFT' || session._count.records > 0) {
      throw new AppError(409, 'Only a draft session with no attendance can be deleted.');
    }
    await prisma.attendanceSession.delete({ where: { id: session.id } });
    return reply.status(204).send();
  });

  api.get('/sessions/:id/attendance', { schema: { params: idParamSchema } }, async (request) => {
    const session = await ownedSession(request.params.id, request.instructor.id);
    const records = await prisma.attendanceRecord.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
    });
    return records.map(presentRecord);
  });

  api.patch(
    '/sessions/:id/attendance/:recordId',
    { schema: { params: attendanceRecordParamSchema, body: updateAttendanceRecordSchema } },
    async (request) => {
      const session = await ownedSession(request.params.id, request.instructor.id);
      const record = await prisma.attendanceRecord.findFirst({
        where: { id: request.params.recordId, sessionId: session.id },
      });
      if (!record) throw new AppError(404, 'Attendance record not found.');
      const updated = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: { attendanceStatus: request.body.attendanceStatus },
      });
      return presentRecord(updated);
    },
  );
}
