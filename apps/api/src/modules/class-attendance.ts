import { classAttendanceExportQuerySchema, idParamSchema } from '@attendence-up/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ownedClassAttendanceQuery, summarizeClassAttendance } from '../domain/class-attendance';
import { closeExpiredSessions } from '../domain/close-expired-sessions';
import {
  classAttendanceFileName,
  renderClassAttendanceCsv,
  renderClassAttendanceXlsx,
  type ClassAttendanceHeading,
} from '../domain/class-attendance-export';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';

async function ownedAttendance(classId: string, ownerId: string) {
  const owned = await prisma.class.findFirst({
    where: { id: classId, ownerId },
    select: { id: true },
  });
  if (!owned) throw new AppError(404, 'Class not found.');
  // Same auto-close as the class page, so a session whose window has ended counts as closed.
  await closeExpiredSessions({ classId: owned.id, instructorId: ownerId });
  const course = await prisma.class.findFirst(ownedClassAttendanceQuery(classId, ownerId));
  if (!course) throw new AppError(404, 'Class not found.');
  return course;
}

function headingFor(
  course: {
    name: string;
    owner: {
      university: string;
      faculty: string;
      career: string;
      printName: string;
      displayName: string;
    };
  },
  locale: 'en' | 'es',
): ClassAttendanceHeading {
  const instructorName = course.owner.printName || course.owner.displayName;
  const attendanceWord = locale === 'en' ? 'Attendance' : 'Asistencia';
  return {
    university: course.owner.university,
    faculty: course.owner.faculty,
    career: course.owner.career,
    attendanceLine: [attendanceWord, course.name].filter(Boolean).join(' '),
    instructorLine: instructorName ? `Instructor: ${instructorName}` : '',
  };
}

export async function classAttendanceRoutes(app: FastifyInstance) {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get('/classes/:id/attendance', { schema: { params: idParamSchema } }, async (request) => {
    const course = await ownedAttendance(request.params.id, request.instructor.id);
    return summarizeClassAttendance(course.sessions);
  });

  api.get(
    '/classes/:id/attendance/export',
    { schema: { params: idParamSchema, querystring: classAttendanceExportQuerySchema } },
    async (request, reply) => {
      const course = await ownedAttendance(request.params.id, request.instructor.id);
      const summary = summarizeClassAttendance(course.sessions);
      const locale = request.query.locale ?? 'es';
      if (request.query.format === 'csv') {
        const csv = renderClassAttendanceCsv(summary);
        return reply
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header(
            'Content-Disposition',
            `attachment; filename="${classAttendanceFileName(course.name, 'csv')}"`,
          )
          .send(Buffer.from(csv, 'utf8'));
      }
      const buffer = await renderClassAttendanceXlsx(summary, headingFor(course, locale));
      return reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header(
          'Content-Disposition',
          `attachment; filename="${classAttendanceFileName(course.name, 'xlsx')}"`,
        )
        .send(buffer);
    },
  );
}
