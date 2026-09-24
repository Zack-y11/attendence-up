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
import PDFDocument from 'pdfkit';
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

type PrintHeading = {
  university: string;
  faculty: string;
  career: string;
  attendanceLine: string;
  instructorLine: string;
  logo: Buffer | null;
};

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

function drawBrandMark(doc: InstanceType<typeof PDFDocument>, x: number, y: number, size: number) {
  const scale = size / 40;
  doc.save();
  doc.translate(x, y);
  doc.scale(scale);
  doc.roundedRect(0, 0, 40, 40, 10).fill('#2563EB');
  doc.save();
  doc.lineWidth(3.5).lineCap('round').lineJoin('round').strokeColor('#ffffff');
  doc.moveTo(12, 21).lineTo(17, 26).lineTo(28, 14).stroke();
  doc.restore();
  doc.circle(28, 14, 2.5).fill('#14B8A6');
  doc.save();
  doc.lineWidth(2).lineCap('round').strokeColor('#ffffff').opacity(0.6);
  doc.moveTo(22, 28).lineTo(15, 28).stroke();
  doc.restore();
  doc.restore();
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

function renderPdf(input: {
  heading: PrintHeading;
  headers: string[];
  rows: string[][];
  signatures: (Buffer | null)[];
  signatureColumn: number;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      layout: input.headers.length > 6 ? 'landscape' : 'portrait',
      margin: 40,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageLeft = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const logoSize = 72;
    const top = doc.y;
    if (input.heading.logo) {
      doc.image(input.heading.logo, pageLeft, top, { fit: [logoSize, logoSize] });
    } else {
      drawBrandMark(doc, pageLeft, top, logoSize);
    }
    const textX = pageLeft + logoSize + 16;
    const textWidth = pageWidth - logoSize - 16;
    const institution = [input.heading.university, input.heading.faculty, input.heading.career].filter(
      (line) => line.trim() !== '',
    );
    let textY = top;
    institution.forEach((line, index) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(index === 0 ? 14 : 11)
        .fillColor('#1c2430')
        .text(line, textX, textY, { width: textWidth, align: 'center' });
      textY = doc.y + 2;
    });
    doc.y = Math.max(textY, top + logoSize) + 10;
    doc.x = pageLeft;
    if (input.heading.attendanceLine) {
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1c2430').text(input.heading.attendanceLine, {
        align: 'left',
        width: pageWidth,
      });
    }
    if (input.heading.instructorLine) {
      doc.font('Helvetica').fontSize(11).fillColor('#1c2430').text(input.heading.instructorLine, {
        align: 'left',
        width: pageWidth,
      });
    }
    doc.moveDown(0.8);
    doc.fillColor('#1c2430');

    const width =
      (doc.page.width - doc.page.margins.left - doc.page.margins.right) / Math.max(input.headers.length, 1);
    const startX = doc.page.margins.left;

    const drawRow = (cells: string[], header = false, signature?: Buffer | null) => {
      const rowHeight = signature ? 36 : 18;
      if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }
      const y = doc.y;
      doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(header ? 9 : 8);
      cells.forEach((cell, index) => {
        if (signature && index === input.signatureColumn) return;
        doc.text(cell || '—', startX + index * width, y, {
          width: width - 8,
          height: rowHeight,
          lineBreak: false,
          ellipsis: true,
        });
      });
      if (signature && input.signatureColumn >= 0) {
        doc.image(signature, startX + input.signatureColumn * width, y, {
          fit: [Math.max(width - 8, 24), 28],
        });
      }
      doc.y = y + rowHeight;
      doc
        .moveTo(startX, doc.y)
        .lineTo(startX + width * cells.length, doc.y)
        .strokeColor('#e4ddd0')
        .stroke();
      doc.moveDown(0.2);
    };

    drawRow(input.headers, true);
    if (input.rows.length === 0) {
      doc.font('Helvetica').fontSize(10).text('No attendance records.');
    } else {
      input.rows.forEach((row, index) =>
        drawRow(row, false, input.signatureColumn >= 0 ? input.signatures[index] : null),
      );
    }
    doc.end();
  });
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
        const buffer = await renderXlsx(table.headers, table.rows, signatures, signatureColumn, heading);
        return reply
          .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          .header('Content-Disposition', `attachment; filename="${fileName(session.name, 'xlsx')}"`)
          .send(buffer);
      }

      const pdf = await renderPdf({
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