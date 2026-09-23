import {
  buildExportTable,
  exportQuerySchema,
  idParamSchema,
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

async function renderXlsx(headers: string[], rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Attendence-Up';
  const sheet = workbook.addWorksheet('Attendance');
  const header = sheet.addRow(headers);
  header.font = { bold: true };
  for (const row of rows) sheet.addRow(row);
  sheet.columns.forEach((column) => {
    column.width = 24;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function renderPdf(input: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: string[][];
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

    doc.fontSize(18).fillColor('#1c2430').text(input.title, { lineBreak: true });
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#5c6675').text(input.subtitle);
    doc.moveDown(0.8);
    doc.fillColor('#1c2430');

    const width =
      (doc.page.width - doc.page.margins.left - doc.page.margins.right) / Math.max(input.headers.length, 1);
    const startX = doc.page.margins.left;

    const drawRow = (cells: string[], header = false) => {
      const rowHeight = 18;
      if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }
      const y = doc.y;
      doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(header ? 9 : 8);
      cells.forEach((cell, index) => {
        doc.text(cell || '—', startX + index * width, y, {
          width: width - 8,
          height: rowHeight,
          lineBreak: false,
          ellipsis: true,
        });
      });
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
      for (const row of input.rows) drawRow(row);
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
        include: { class: { select: { name: true } } },
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
          latitude: record.latitude,
          longitude: record.longitude,
        })),
      });

      const subtitle = [
        session.class?.name,
        session.name,
        `${records.length} attendance records`,
        `Times shown in ${timeZone}`,
      ]
        .filter(Boolean)
        .join(' · ');

      if (request.query.format === 'xlsx') {
        const buffer = await renderXlsx(table.headers, table.rows);
        return reply
          .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
          .header('Content-Disposition', `attachment; filename="${fileName(session.name, 'xlsx')}"`)
          .send(buffer);
      }

      const pdf = await renderPdf({ title: 'Attendance', subtitle, headers: table.headers, rows: table.rows });
      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${fileName(session.name, 'pdf')}"`)
        .send(pdf);
    },
  );
}
