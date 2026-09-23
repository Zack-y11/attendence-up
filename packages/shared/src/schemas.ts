import { z } from 'zod';
import { ATTENDANCE_STATUSES } from './labels';

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().positive().max(100_000),
});

export const isoDateTimeSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Expected an ISO date-time.',
});

const optionalDate = isoDateTimeSchema.nullable().optional();

function assertTimeOrder(
  value: {
    startsAt?: string | null;
    endsAt?: string | null;
    attendanceOpensAt?: string | null;
    attendanceClosesAt?: string | null;
  },
  ctx: z.RefinementCtx,
) {
  if (value.startsAt && value.endsAt && Date.parse(value.endsAt) < Date.parse(value.startsAt)) {
    ctx.addIssue({
      code: 'custom',
      message: 'End time must be after the start time.',
      path: ['endsAt'],
    });
  }
  if (
    value.attendanceOpensAt &&
    value.attendanceClosesAt &&
    Date.parse(value.attendanceClosesAt) < Date.parse(value.attendanceOpensAt)
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'Attendance close must be after attendance open.',
      path: ['attendanceClosesAt'],
    });
  }
}

const classFieldsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  location: locationSchema.nullable().optional(),
  startsAt: optionalDate,
  endsAt: optionalDate,
});

export const createClassSchema = classFieldsSchema.superRefine(assertTimeOrder);

export const updateClassSchema = classFieldsSchema
  .partial()
  .extend({ status: z.enum(['ACTIVE', 'ARCHIVED']).optional() })
  .superRefine(assertTimeOrder);

const sessionFieldsSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  attendanceOpensAt: optionalDate,
  attendanceClosesAt: optionalDate,
  location: locationSchema.nullable().optional(),
});

export const sessionWriteSchema = sessionFieldsSchema.superRefine(assertTimeOrder);
export const updateSessionSchema = sessionFieldsSchema.partial().superRefine(assertTimeOrder);

export const duplicateSessionSchema = z.object({
  shiftDays: z.number().int().min(0).max(366).optional(),
});

export const updateAttendanceRecordSchema = z.object({
  attendanceStatus: z.enum(ATTENDANCE_STATUSES),
});

export const submitAttendanceSchema = z
  .object({
    studentCode: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers, or hyphens.'),
    studentName: z.string().trim().min(1).max(120),
    signature: z.string().trim().max(500).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    locationAccuracyMeters: z.number().min(0).max(100_000).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.latitude != null) !== (value.longitude != null)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Latitude and longitude must be provided together.',
        path: ['latitude'],
      });
    }
  });

export const sessionListQuerySchema = z.object({
  scope: z.enum(['all', 'open', 'draft', 'closed']).optional(),
});

export const exportQuerySchema = z.object({
  format: z.enum(['xlsx', 'pdf']),
  columns: z.string().optional(),
  timezone: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.uuid(),
});

export const attendanceRecordParamSchema = z.object({
  id: z.uuid(),
  recordId: z.uuid(),
});

export const tokenParamSchema = z.object({
  token: z.string().min(16).max(128),
});

export type LocationInput = z.infer<typeof locationSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type SessionWriteInput = z.infer<typeof sessionWriteSchema>;
export type SubmitAttendanceInput = z.infer<typeof submitAttendanceSchema>;
