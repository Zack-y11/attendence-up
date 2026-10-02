import {
  absenceNoteForCheckIn,
  publicExtensionQuerySchema,
  publicStudentLookupQuerySchema,
  submitAttendanceSchema,
  tokenParamSchema,
} from '@attendence-up/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { attendanceGate, attendanceGateMessage } from '../domain/attendance-gate';
import {
  extensionInviteMessage,
  validateExtensionInvite,
} from '../domain/extension-invite';
import { deriveLocationStatus } from '../domain/location-status';
import { findExtensionInviteForSession } from '../domain/public-extension';
import { lookupSavedStudentName } from '../domain/public-student';
import { normalizeStudentCode } from '../domain/student-code';
import { syncAttendanceWindows } from '../domain/sync-attendance-windows';
import { AppError } from '../lib/errors';
import { presentPublicSession, toLocation } from '../lib/presenters';
import { isUniqueConstraintError, prisma } from '../lib/prisma';

/** Public check-in and exact-code lookup share this limit. */
export const publicAttendanceRateLimit = {
  max: 30,
  timeWindow: '1 minute',
} as const;

async function loadPublicSession(publicToken: string) {
  const session = await prisma.attendanceSession.findUnique({
    where: { publicToken },
    include: { class: { select: { name: true, startsAt: true, endsAt: true } } },
  });
  if (!session) throw new AppError(404, 'This attendance link is not valid.');
  await syncAttendanceWindows({ id: session.id });
  const current = await prisma.attendanceSession.findUnique({
    where: { id: session.id },
    include: { class: { select: { name: true, startsAt: true, endsAt: true } } },
  });
  if (!current) throw new AppError(404, 'This attendance link is not valid.');
  return current;
}

export async function publicAttendanceRoutes(app: FastifyInstance) {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get(
    '/sessions/:token',
    { schema: { params: tokenParamSchema, querystring: publicExtensionQuerySchema } },
    async (request) => {
      const current = await loadPublicSession(request.params.token);
      const now = new Date();
      const invite = await findExtensionInviteForSession(request.query.e, current.id, now);
      return presentPublicSession(current, now, {
        extensionCheckIn: invite != null,
      });
    },
  );

  api.get(
    '/sessions/:token/student',
    {
      schema: {
        params: tokenParamSchema,
        querystring: publicStudentLookupQuerySchema.merge(publicExtensionQuerySchema),
      },
      config: {
        rateLimit: publicAttendanceRateLimit,
      },
    },
    async (request, reply) => {
      const current = await loadPublicSession(request.params.token);
      const now = new Date();
      const invite = await findExtensionInviteForSession(request.query.e, current.id, now);
      const gate = attendanceGate(current, now);
      const codeMatchesInvite =
        invite != null &&
        normalizeStudentCode(request.query.studentCode) === invite.studentCode;

      if (!gate.ok && !codeMatchesInvite) {
        return reply.header('cache-control', 'no-store').send({ studentName: null });
      }

      const studentName = await lookupSavedStudentName(current.classId, request.query.studentCode);
      return reply.header('cache-control', 'no-store').send({ studentName });
    },
  );

  api.post(
    '/sessions/:token/attendance',
    {
      schema: {
        params: tokenParamSchema,
        querystring: publicExtensionQuerySchema,
        body: submitAttendanceSchema,
      },
      config: {
        rateLimit: publicAttendanceRateLimit,
      },
    },
    async (request, reply) => {
      const current = await loadPublicSession(request.params.token);
      const now = new Date();
      const body = request.body;
      const extensionToken = request.query.e;

      let invite = null as Awaited<ReturnType<typeof findExtensionInviteForSession>>;
      if (extensionToken) {
        invite = await prisma.attendanceExtensionInvite.findUnique({
          where: { token: extensionToken },
        });
        const check = validateExtensionInvite(invite, current.id, body.studentCode, now);
        if (!check.ok) {
          throw new AppError(403, extensionInviteMessage(check.reason), `EXTENSION_${check.reason}`);
        }
      } else {
        const gate = attendanceGate(current, now);
        if (!gate.ok) {
          throw new AppError(403, attendanceGateMessage(gate.reason), gate.reason);
        }
      }

      const derived = deriveLocationStatus(
        {
          latitude: body.latitude ?? null,
          longitude: body.longitude ?? null,
          accuracyMeters: body.locationAccuracyMeters ?? null,
        },
        toLocation(
          current.locationLatitude,
          current.locationLongitude,
          current.locationRadiusMeters,
        ),
      );
      const absence = absenceNoteForCheckIn(body.notInClassroom === true, body.absenceNote);
      if (!absence.ok) {
        throw new AppError(400, absence.message, 'ABSENCE_NOTE_REQUIRED');
      }

      const studentCode = normalizeStudentCode(body.studentCode);

      try {
        const record = await prisma.$transaction(async (tx) => {
          if (invite) {
            const marked = await tx.attendanceExtensionInvite.updateMany({
              where: { id: invite.id, usedAt: null },
              data: { usedAt: now },
            });
            if (marked.count === 0) {
              throw new AppError(403, extensionInviteMessage('USED'), 'EXTENSION_USED');
            }
          }
          return tx.attendanceRecord.create({
            data: {
              sessionId: current.id,
              studentCode,
              studentName: body.studentName.trim(),
              signature: body.signature?.trim() ? body.signature.trim() : null,
              latitude: body.latitude ?? null,
              longitude: body.longitude ?? null,
              locationAccuracyMeters: body.locationAccuracyMeters ?? null,
              distanceFromSessionMeters: derived.distanceMeters,
              locationStatus: derived.status,
              attendanceStatus: invite ? 'LATE' : 'PRESENT',
              absenceNote: absence.note,
            },
          });
        });
        return reply.status(201).send({
          id: record.id,
          studentCode: record.studentCode,
          studentName: record.studentName,
          createdAt: record.createdAt.toISOString(),
        });
      } catch (error) {
        if (error instanceof AppError) throw error;
        if (isUniqueConstraintError(error)) {
          throw new AppError(
            409,
            'Attendance was already recorded for this student code.',
            'DUPLICATE_ATTENDANCE',
          );
        }
        throw error;
      }
    },
  );
}
