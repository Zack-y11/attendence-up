import { formatAttendancePercentage, type ClassAttendanceDto } from '@attendence-up/shared';
import ExcelJS from 'exceljs';

const EXPORT_HEADERS = ['Student code', 'Student name', 'Attended', 'Total', 'Percentage'] as const;

/**
 * Spreadsheet apps treat a leading = + - or @ as a formula.
 * A leading apostrophe forces the cell to be text. Also catches a formula
 * hidden behind spaces, tabs, or line breaks.
 */
const FORMULA_PREFIX = /^[\s]*[=+\-@]/;

export function guardSpreadsheetCell(value: string): string {
  if (FORMULA_PREFIX.test(value)) return `'${value}`;
  return value;
}

export function classAttendanceRows(summary: ClassAttendanceDto): string[][] {
  return summary.students.map((student) =>
    [
      student.studentCode,
      student.studentName,
      String(student.attended),
      String(student.total),
      formatAttendancePercentage(student.percentage),
    ].map(guardSpreadsheetCell),
  );
}

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function renderClassAttendanceCsv(summary: ClassAttendanceDto): string {
  const lines = [EXPORT_HEADERS.map(guardSpreadsheetCell), ...classAttendanceRows(summary)].map(
    (row) => row.map(csvField).join(','),
  );
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export type ClassAttendanceHeading = {
  university: string;
  faculty: string;
  career: string;
  attendanceLine: string;
  instructorLine: string;
};

export function classAttendanceFileName(name: string, extension: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);
  return `${slug || 'attendance'}.${extension}`;
}

export async function renderClassAttendanceXlsx(
  summary: ClassAttendanceDto,
  heading: ClassAttendanceHeading,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Attendence-Up';
  const sheet = workbook.addWorksheet('Attendance');
  const headers = [...EXPORT_HEADERS];
  const lines = [
    heading.university,
    heading.faculty,
    heading.career,
    heading.attendanceLine,
    heading.instructorLine,
  ]
    .map((line) => line.trim())
    .filter((line) => line !== '');
  const span = Math.max(headers.length, 1);
  for (const line of lines) {
    const added = sheet.addRow([guardSpreadsheetCell(line)]);
    sheet.mergeCells(added.number, 1, added.number, span);
    const isAttendance = line === heading.attendanceLine;
    const isInstructor = line === heading.instructorLine;
    added.font = { bold: !isInstructor, size: 12 };
    added.alignment = { horizontal: isAttendance || isInstructor ? 'left' : 'center' };
  }
  if (lines.length > 0) sheet.addRow([]);
  const header = sheet.addRow(headers.map(guardSpreadsheetCell));
  header.font = { bold: true };
  for (const row of classAttendanceRows(summary)) sheet.addRow(row);
  sheet.columns.forEach((column) => {
    column.width = 24;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
