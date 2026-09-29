import {
  SIGNATURE_IMAGE_PREFIX,
  buildExportTable,
  exportQuerySchema,
  idParamSchema,
  isClassLogo,
  isSignatureImage,
  isValidTimeZone,
  resolveExportColumns,
} from '@attendence-up/shared';
import ExcelJS from 'exceljs';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { renderAttendancePdf, type AttendancePdfHeading } from '../domain/attendance-pdf';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';

function fileName(name: string, extension: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
  return `${slug || 'attendance'}.${extension}`;
}

function signaturePng(value: string | null): Buffer | null {
  if (!value || !isSignatureImage(value)) return null;
  const payload = value.slice(SIGNATURE_IMAGE_PREFIX.length);
  const buffer = Buffer.from(payload, 'base64');
  return buffer.length > 8 ? buffer : null;
}

type PrintHeading = AttendancePdfHeading;

function headingLines(heading: PrintHeading): string[] {
  return [
    heading.university,
    heading.faculty,
    heading.career,
    heading.attendanceLine,
    heading.instructorLine,
  ].filter((line) => line.trim() !== '');
}

function formatHeadingDate(value: Date | null, timeZone: string, locale: 'es' | 'en'): string {
  if (!value) return '';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'es', {
    dateStyle: 'long',
    timeZone,
  }).format(value);
}

function printLogo(value: string | null): Buffer | null {
  if (!value || !isClassLogo(value)) return null;
  const payload = value.slice(value.indexOf(',') + 1);
  const buffer = Buffer.from(payload, 'base64');
  return buffer.length > 8 ? buffer : null;
}

async function renderXlsx(
  headers: string[],
  rows: string[][],
  signatures: (Buffer | null)[],
  signatureColumn: number,
  heading: PrintHeading,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Attendence-Up';
  const sheet = workbook.addWorksheet('Attendance');
  const lines = headingLines(heading);
  const span = Math.max(headers.length, 1);
  for (const line of lines) {
    const added = sheet.addRow([line]);
    sheet.mergeCells(added.number, 1, added.number, span);
    const isAttendance = line === heading.attendanceLine;
    const isInstructor = line === heading.instructorLine;
    added.font = { bold: !isInstructor, size: 12 };
    added.alignment = { horizontal: isAttendance || isInstructor ? 'left' : 'center' };
  }
  if (lines.length > 0) sheet.addRow([]);
  const header = sheet.addRow(headers);
  header.font = { bold: true };
  const firstDataRow = header.number + 1;
  for (const row of rows) sheet.addRow(row);
  sheet.columns.forEach((column, index) => {
    column.width = index === signatureColumn ? 22 : 24;
  });
  signatures.forEach((image, index) => {
    if (!image || signatureColumn < 0) return;
    const rowNumber = firstDataRow + index;
    sheet.getRow(rowNumber).height = 32;
    const imageId = workbook.addImage({ base64: image.toString('base64'), extension: 'png' });
    sheet.addImage(imageId, {
      tl: { col: signatureColumn, row: rowNumber - 1 },
      ext: { width: 120, height: 28 },
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function exportRoutes(app: FastifyInstance) {
  const api = app.withTypeProvider<ZodTypeProvider>();

  api.get(
    '/sessions/:id/export',
    { schema: { params: idParamSchema, querystring: exportQuerySchema } },
    async (request, reply) => {
      const session = await prisma.attendanceSession.findFirst({
        where: { id: request.params.id, instructorId: request.instructor.id },
        include: {
          class: { select: { name: true } },
          instructor: {
            select: {
              displayName: true,
              university: true,
              faculty: true,
              career: true,
              printName: true,
              logo: true,
            },
          },
        },
      });
      if (!session) throw new AppError(404, 'Session not found.');

      const columns = resolveExportColumns(request.query.columns);
      if (request.query.columns && columns.length === 0) {
        throw new AppError(400, 'Select at least one known column.');
      }
      const timeZone = request.query.timezone?.trim() || 'UTC';
      if (!isValidTimeZone(timeZone)) {
        throw new AppError(400, 'Unknown time zone.');
      }

      const records = await prisma.attendanceRecord.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'asc' },
      });
      const signatureColumn = columns.indexOf('signature');
      const signatures = records.map((record) => signaturePng(record.signature));
      const table = buildExportTable({
        columns,
        sessionName: session.name,
        className: session.class?.name ?? null,
        timeZone,
        records: records.map((record) => ({
          studentCode: record.studentCode,
          studentName: record.studentName,
          signature: record.signature,
          createdAt: record.createdAt.toISOString(),
          distanceFromSessionMeters: record.distanceFromSessionMeters,
          locationAccuracyMeters: record.locationAccuracyMeters,
          locationStatus: record.locationStatus,
          attendanceStatus: record.attendanceStatus,
          absenceNote: record.absenceNote,
          latitude: record.latitude,
          longitude: record.longitude,
        })),
      });

      const locale = request.query.locale ?? 'es';
      const subject = session.class?.name || session.name;
      const when = formatHeadingDate(session.attendanceOpensAt, timeZone, locale);
      const attendanceWord = locale === 'en' ? 'Attendance' : 'Asistencia';
      const instructorWord = 'Instructor';
      const instructorName = session.instructor.printName || session.instructor.displayName;
      const heading: PrintHeading = {
        university: session.instructor.university,
        faculty: session.instructor.faculty,
        career: session.instructor.career,
        attendanceLine: [attendanceWord, subject, when].filter(Boolean).join(' '),
        instructorLine: instructorName ? `${instructorWord}: ${instructorName}` : '',
        logo: printLogo(session.instructor.logo),
      };

      if (request.query.format === 'xlsx') {
        const buffer = await renderXlsx(
          table.headers,
          table.rows,
          signatures,
          signatureColumn,
          heading,
        );
        return reply
          .header(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          )
          .header('Content-Disposition', `attachment; filename="${fileName(session.name, 'xlsx')}"`)
          .send(buffer);
      }

      const pdf = await renderAttendancePdf({
        heading,
        headers: table.headers,
        rows: table.rows,
        signatures,
        signatureColumn,
      });
      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${fileName(session.name, 'pdf')}"`)
        .send(pdf);
    },
  );
}
