import {
  missingCheckInCodeMessage,
  publicSessionQuerySchema,
  staleCheckInCodeMessage,
  submitAttendanceSchema,
  tokenParamSchema,
  type CheckInCodeStatus,
} from '@attendence-up/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { attendanceGate, attendanceGateMessage } from '../domain/attendance-gate';
import { judgeCheckInCode } from '../domain/check-in-code';
import { findCheckInPass } from '../domain/check-in-codes';
import { deriveLocationStatus } from '../domain/location-status';
import { normalizeStudentCode } from '../domain/student-code';
import { AppError } from '../lib/errors';
import { presentPublicSession, toLocation } from '../lib/presenters';
import { isUniqueConstraintError, prisma } from '../lib/prisma';

async function checkInCodeStatus(
  sessionId: string,
  code: string | undefined,
  now: Date,
): Promise<CheckInCodeStatus> {
  const submitted = code?.trim() ?? '';
  if (!submitted) return 'ABSENT';
  const pass = await findCheckInPass(sessionId, submitted);
  return judgeCheckInCode(pass, now).ok ? 'VALID' : 'EXPIRED';
}

export async function publicAttendanceRoutes(app: FastifyInstance) {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get(
    '/sessions/:token',
    { schema: { params: tokenParamSchema, querystring: publicSessionQuerySchema } },
    async (request) => {
      const session = await prisma.attendanceSession.findUnique({
        where: { publicToken: request.params.token },
        include: { class: { select: { name: true, startsAt: true, endsAt: true } } },
      });
      if (!session) throw new AppError(404, 'This attendance link is not valid.');
      const now = new Date();
      return presentPublicSession(
        session,
        now,
        await checkInCodeStatus(session.id, request.query.c, now),
      );
    },
  );

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

      const now = new Date();
      const gate = attendanceGate(session, now);
      if (!gate.ok) {
        throw new AppError(403, attendanceGateMessage(gate.reason), gate.reason);
      }

      const submittedCode = request.body.checkInCode?.trim() ?? '';
      if (!submittedCode) {
        throw new AppError(403, missingCheckInCodeMessage(), 'MISSING_CHECK_IN_CODE');
      }
      const pass = await findCheckInPass(session.id, submittedCode);
      if (!judgeCheckInCode(pass, now).ok) {
        throw new AppError(403, staleCheckInCodeMessage(), 'STALE_CHECK_IN_CODE');
      }

      const body = request.body;
      const derived = deriveLocationStatus(
        {
          latitude: body.latitude ?? null,
          longitude: body.longitude ?? null,
          accuracyMeters: body.locationAccuracyMeters ?? null,
        },
        toLocation(
          session.locationLatitude,
          session.locationLongitude,
          session.locationRadiusMeters,
        ),
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
