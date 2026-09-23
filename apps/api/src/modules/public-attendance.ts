import { submitAttendanceSchema, tokenParamSchema } from '@attendence-up/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { attendanceGate, attendanceGateMessage } from '../domain/attendance-gate';
import { deriveLocationStatus } from '../domain/location-status';
import { normalizeStudentCode } from '../domain/student-code';
import { AppError } from '../lib/errors';
import { presentPublicSession, toLocation } from '../lib/presenters';
import { isUniqueConstraintError, prisma } from '../lib/prisma';

export async function publicAttendanceRoutes(app: FastifyInstance) {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get('/sessions/:token', { schema: { params: tokenParamSchema } }, async (request) => {
    const session = await prisma.attendanceSession.findUnique({
      where: { publicToken: request.params.token },
      include: { class: { select: { name: true, startsAt: true, endsAt: true } } },
    });
    if (!session) throw new AppError(404, 'This attendance link is not valid.');
    return presentPublicSession(session, new Date());
  });

  api.post(
    '/sessions/:token/attendance',
    {
      schema: { params: tokenParamSchema, body: submitAttendanceSchema },
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const session = await prisma.attendanceSession.findUnique({
        where: { publicToken: request.params.token },
      });
      if (!session) throw new AppError(404, 'This attendance link is not valid.');

      const gate = attendanceGate(session, new Date());
      if (!gate.ok) {
        throw new AppError(403, attendanceGateMessage(gate.reason), gate.reason);
      }

      const body = request.body;
      const derived = deriveLocationStatus(
        {
          latitude: body.latitude ?? null,
          longitude: body.longitude ?? null,
          accuracyMeters: body.locationAccuracyMeters ?? null,
        },
        toLocation(session.locationLatitude, session.locationLongitude, session.locationRadiusMeters),
      );

      try {
        const record = await prisma.attendanceRecord.create({
          data: {
            sessionId: session.id,
            studentCode: normalizeStudentCode(body.studentCode),
            studentName: body.studentName.trim(),
            signature: body.signature?.trim() ? body.signature.trim() : null,
            latitude: body.latitude ?? null,
            longitude: body.longitude ?? null,
            locationAccuracyMeters: body.locationAccuracyMeters ?? null,
            distanceFromSessionMeters: derived.distanceMeters,
            locationStatus: derived.status,
          },
        });
        return reply.status(201).send({
          id: record.id,
          studentCode: record.studentCode,
          studentName: record.studentName,
          createdAt: record.createdAt.toISOString(),
        });
      } catch (error) {
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
