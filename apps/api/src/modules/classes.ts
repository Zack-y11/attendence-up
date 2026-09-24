import {
  createClassSchema,
  idParamSchema,
  sessionWriteSchema,
  updateClassSchema,
} from '@attendence-up/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { closeExpiredSessions } from '../domain/close-expired-sessions';
import { resolveSessionLocation } from '../domain/session-location';
import { createPublicToken } from '../domain/tokens';
import { AppError } from '../lib/errors';
import {
  classLocationColumns,
  classScheduleColumns,
  dateColumns,
  presentClass,
  presentClassDetail,
  presentSession,
  sessionLocationColumns,
  toLocation,
} from '../lib/presenters';
import { prisma } from '../lib/prisma';

const sessionInclude = {
  class: { select: { name: true, startsAt: true, endsAt: true } },
  _count: { select: { records: true } },
} as const;

async function ownedClass(id: string, ownerId: string) {
  const item = await prisma.class.findFirst({
    where: { id, ownerId },
    include: { _count: { select: { sessions: true } } },
  });
  if (!item) throw new AppError(404, 'Class not found.');
  return item;
}

export async function classRoutes(app: FastifyInstance) {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get('/classes', async (request) => {
    const classes = await prisma.class.findMany({
      where: { ownerId: request.instructor.id },
      include: { _count: { select: { sessions: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return classes.map(presentClass);
  });

  api.post('/classes', { schema: { body: createClassSchema } }, async (request, reply) => {
    const created = await prisma.class.create({
      data: {
        ownerId: request.instructor.id,
        name: request.body.name,
        description: request.body.description ?? '',
        ...classScheduleColumns(request.body),
        ...classLocationColumns(request.body.location),
      },
      include: { _count: { select: { sessions: true } } },
    });
    return reply.status(201).send(presentClass(created));
  });

  api.get('/classes/:id', { schema: { params: idParamSchema } }, async (request) => {
    const item = await ownedClass(request.params.id, request.instructor.id);
    await closeExpiredSessions({ classId: item.id });
    const sessions = await prisma.attendanceSession.findMany({
      where: { classId: item.id },
      include: { _count: { select: { records: true } } },
      orderBy: [{ attendanceOpensAt: 'desc' }, { createdAt: 'desc' }],
    });
    return presentClassDetail(item, sessions);
  });

  api.patch(
    '/classes/:id',
    { schema: { params: idParamSchema, body: updateClassSchema } },
    async (request) => {
      await ownedClass(request.params.id, request.instructor.id);
      const updated = await prisma.class.update({
        where: { id: request.params.id },
        data: {
          ...(request.body.name !== undefined ? { name: request.body.name } : {}),
          ...(request.body.description !== undefined ? { description: request.body.description } : {}),
          ...(request.body.status !== undefined ? { status: request.body.status } : {}),
          ...classScheduleColumns(request.body),
          ...classLocationColumns(request.body.location),
        },
        include: { _count: { select: { sessions: true } } },
      });
      return presentClass(updated);
    },
  );

  api.post(
    '/classes/:id/sessions',
    { schema: { params: idParamSchema, body: sessionWriteSchema } },
    async (request, reply) => {
      const course = await ownedClass(request.params.id, request.instructor.id);
      if (course.status === 'ARCHIVED') {
        throw new AppError(409, 'Archived classes cannot accept new sessions.');
      }
      const location = resolveSessionLocation(
        request.body.location,
        toLocation(course.defaultLatitude, course.defaultLongitude, course.defaultRadiusMeters),
      );
      const created = await prisma.attendanceSession.create({
        data: {
          publicToken: createPublicToken(),
          classId: course.id,
          instructorId: request.instructor.id,
          name: request.body.name,
          description: request.body.description ?? '',
          ...dateColumns(request.body),
          ...sessionLocationColumns(location),
        },
        include: sessionInclude,
      });
      return reply.status(201).send(presentSession(created));
    },
  );
}
