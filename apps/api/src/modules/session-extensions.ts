import {
  createExtensionInviteSchema,
  extensionInviteParamSchema,
  idParamSchema,
  normalizeStudentCode,
} from '@attendence-up/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  DEFAULT_EXTENSION_MINUTES,
  extensionExpiresAt,
} from '../domain/extension-invite';
import { syncAttendanceWindows } from '../domain/sync-attendance-windows';
import { createPublicToken } from '../domain/tokens';
import { AppError } from '../lib/errors';
import { presentExtensionInvite } from '../lib/presenters';
import { prisma } from '../lib/prisma';

async function ownedSession(id: string, instructorId: string) {
  await syncAttendanceWindows({ id, instructorId });
  const session = await prisma.attendanceSession.findFirst({
    where: { id, instructorId },
    select: { id: true, publicToken: true },
  });
  if (!session) throw new AppError(404, 'Session not found.');
  return session;
}

export async function sessionExtensionRoutes(app: FastifyInstance) {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get('/sessions/:id/extensions', { schema: { params: idParamSchema } }, async (request) => {
    const session = await ownedSession(request.params.id, request.instructor.id);
    const invites = await prisma.attendanceExtensionInvite.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
    });
    return invites.map((invite) => presentExtensionInvite(invite, session.publicToken));
  });

  api.post(
    '/sessions/:id/extensions',
    { schema: { params: idParamSchema, body: createExtensionInviteSchema } },
    async (request, reply) => {
      const session = await ownedSession(request.params.id, request.instructor.id);
      const studentCode = normalizeStudentCode(request.body.studentCode);
      const expiresInMinutes = request.body.expiresInMinutes ?? DEFAULT_EXTENSION_MINUTES;
      const now = new Date();

      const existing = await prisma.attendanceRecord.findUnique({
        where: { sessionId_studentCode: { sessionId: session.id, studentCode } },
      });
      if (existing) {
        throw new AppError(
          409,
          'This student already has attendance for this session.',
          'DUPLICATE_ATTENDANCE',
        );
      }

      const created = await prisma.attendanceExtensionInvite.create({
        data: {
          sessionId: session.id,
          instructorId: request.instructor.id,
          token: createPublicToken(),
          studentCode,
          expiresAt: extensionExpiresAt(now, expiresInMinutes),
        },
      });
      return reply
        .status(201)
        .send(presentExtensionInvite(created, session.publicToken));
    },
  );

  api.delete(
    '/sessions/:id/extensions/:inviteId',
    { schema: { params: extensionInviteParamSchema } },
    async (request, reply) => {
      const session = await ownedSession(request.params.id, request.instructor.id);
      const deleted = await prisma.attendanceExtensionInvite.deleteMany({
        where: { id: request.params.inviteId, sessionId: session.id, usedAt: null },
      });
      if (deleted.count === 0) {
        throw new AppError(404, 'Extension invite not found.');
      }
      return reply.status(204).send();
    },
  );
}
