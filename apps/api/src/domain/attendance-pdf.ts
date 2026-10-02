import type { ExportColumnId } from '@attendence-up/shared';
import PDFDocument from 'pdfkit';

export type AttendancePdfHeading = {
  university: string;
  faculty: string;
  career: string;
  attendanceLine: string;
  instructorLine: string;
  logo: Buffer | null;
};

type PdfDoc = InstanceType<typeof PDFDocument>;

const INK = '#1c2430';
const HEADER_FILL = '#f3f3f3';
const GRID = '#d4d4d4';
const GRID_LIGHT = '#e5e5e5';

/** Match Excel export column sizing so PDF columns feel the same. */
const PDF_COLUMN_WEIGHT: Record<ExportColumnId, number> = {
  studentCode: 78,
  studentName: 118,
  attendanceStatus: 64,
  absenceNote: 88,
  signature: 72,
  attendanceTime: 82,
  distance: 50,
  accuracy: 52,
  locationStatus: 74,
  sessionName: 92,
  className: 100,
  latitude: 64,
  longitude: 64,
};

function pdfColumnWidths(columns: ExportColumnId[], pageWidth: number): number[] {
  if (columns.length === 0) return [pageWidth];
  const weights = columns.map((column) => PDF_COLUMN_WEIGHT[column] ?? 72);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const widths = weights.map((weight) => (weight / total) * pageWidth);
  const used = widths.slice(0, -1).reduce((sum, width) => sum + width, 0);
  widths[widths.length - 1] = pageWidth - used;
  return widths;
}

/** Same text block as the Excel sheet: institution centered, session lines left. */
function drawSheetHeading(doc: PdfDoc, heading: AttendancePdfHeading) {
  const pageLeft = doc.page.margins.left;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const institution = [heading.university, heading.faculty, heading.career].filter(
    (line) => line.trim() !== '',
  );
  institution.forEach((line, index) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(index === 0 ? 12 : 11)
      .fillColor(INK)
      .text(line, pageLeft, doc.y, { width: pageWidth, align: 'center' });
    doc.y += 2;
  });
  if (institution.length > 0) doc.moveDown(0.4);
  if (heading.attendanceLine) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(heading.attendanceLine, {
      align: 'left',
      width: pageWidth,
    });
  }
  if (heading.instructorLine) {
    doc.font('Helvetica').fontSize(11).fillColor(INK).text(heading.instructorLine, {
      align: 'left',
      width: pageWidth,
    });
  }
  doc.moveDown(0.6);
}

function drawAttendanceTable(
  doc: PdfDoc,
  input: {
    columns: ExportColumnId[];
    headers: string[];
    rows: string[][];
    signatures: (Buffer | null)[];
    signatureColumn: number;
  },
) {
  const startX = doc.page.margins.left;
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const widths = pdfColumnWidths(input.columns, tableWidth);
  const padX = 5;
  const padY = 4;

  const textHeight = (value: string, columnWidth: number, header: boolean) => {
    doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(header ? 8 : 8);
    return doc.heightOfString(value || ' ', {
      width: Math.max(columnWidth - padX * 2, 8),
      lineGap: 1,
    });
  };

  const drawHeader = () => {
    const contentHeight = Math.max(
      12,
      ...input.headers.map((header, index) => textHeight(header, widths[index] ?? tableWidth, true)),
    );
    const rowHeight = contentHeight + padY * 2;
    const y = doc.y;
    let x = startX;
    input.headers.forEach((header, index) => {
      const columnWidth = widths[index] ?? tableWidth;
      doc.save();
      doc.rect(x, y, columnWidth, rowHeight).fill(HEADER_FILL);
      doc.restore();
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(8).text(header, x + padX, y + padY, {
        width: columnWidth - padX * 2,
        height: contentHeight,
        lineGap: 1,
      });
      x += columnWidth;
    });
    doc.lineWidth(0.5).strokeColor(GRID);
    x = startX;
    input.headers.forEach((_, index) => {
      const columnWidth = widths[index] ?? tableWidth;
      doc.rect(x, y, columnWidth, rowHeight).stroke();
      x += columnWidth;
    });
    doc.x = startX;
    doc.y = y + rowHeight;
  };

  const drawBody = (cells: string[], signature: Buffer | null) => {
    const contentHeight = Math.max(
      11,
      ...cells.map((cell, index) =>
        signature && index === input.signatureColumn ? 24 : textHeight(cell, widths[index] ?? tableWidth, false),
      ),
    );
    const rowHeight = contentHeight + padY * 2;
    const pageBottom = doc.page.height - doc.page.margins.bottom;
    if (doc.y + rowHeight > pageBottom) {
      doc.addPage();
      drawHeader();
    }
    const y = doc.y;
    let x = startX;
    cells.forEach((cell, index) => {
      const columnWidth = widths[index] ?? tableWidth;
      if (signature && index === input.signatureColumn) {
        doc.image(signature, x + padX, y + padY, {
          fit: [Math.max(columnWidth - padX * 2, 16), contentHeight],
        });
      } else {
        doc.fillColor(INK).font('Helvetica').fontSize(8).text(cell || ' ', x + padX, y + padY, {
          width: columnWidth - padX * 2,
          height: contentHeight,
          lineGap: 1,
        });
      }
      x += columnWidth;
    });
    doc.lineWidth(0.5).strokeColor(GRID_LIGHT);
    x = startX;
    cells.forEach((_, index) => {
      const columnWidth = widths[index] ?? tableWidth;
      doc.rect(x, y, columnWidth, rowHeight).stroke();
      x += columnWidth;
    });
    doc.x = startX;
    doc.y = y + rowHeight;
  };

  drawHeader();
  if (input.rows.length === 0) {
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(10).fillColor(INK).text('No attendance records.', startX, doc.y, {
      width: tableWidth,
    });
  } else {
    input.rows.forEach((row, index) =>
      drawBody(row, input.signatureColumn >= 0 ? (input.signatures[index] ?? null) : null),
    );
  }
}

export function renderAttendancePdf(input: {
  heading: AttendancePdfHeading;
  columns: ExportColumnId[];
  headers: string[];
  rows: string[][];
  signatures: (Buffer | null)[];
  signatureColumn: number;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      layout: input.headers.length > 5 ? 'landscape' : 'portrait',
      margin: 36,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawSheetHeading(doc, input.heading);
    doc.fillColor(INK);
    drawAttendanceTable(doc, input);
    doc.end();
  });
}
