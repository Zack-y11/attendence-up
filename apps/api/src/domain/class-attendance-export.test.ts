import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  classAttendanceFileName,
  guardSpreadsheetCell,
  renderClassAttendanceCsv,
  renderClassAttendanceXlsx,
} from './class-attendance-export';

const risky = {
  closedSessionCount: 1,
  excusedCountsInDenominator: false,
  students: [
    {
      studentCode: '-SM001',
      studentName: '=HYPERLINK("http://evil")',
      attended: 1,
      total: 1,
      percentage: 100,
    },
    {
      studentCode: 'SM002',
      studentName: '+cmd|" /C calc"!A0',
      attended: 0,
      total: 1,
      percentage: 0,
    },
    {
      studentCode: '@SUM(A1)',
      studentName: ' Ana "N" Ruiz, Jr.',
      attended: 0,
      total: 0,
      percentage: null,
    },
  ],
};

describe('guardSpreadsheetCell', () => {
  it('prefixes cells that start with = + - or @, including ones hidden by whitespace', () => {
    expect(guardSpreadsheetCell('=1+1')).toBe("'=1+1");
    expect(guardSpreadsheetCell('+cmd')).toBe("'+cmd");
    expect(guardSpreadsheetCell('-SM001')).toBe("'-SM001");
    expect(guardSpreadsheetCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(guardSpreadsheetCell(' =1+1')).toBe("' =1+1");
    expect(guardSpreadsheetCell('\t=1+1')).toBe("'\t=1+1");
    expect(guardSpreadsheetCell('Ana')).toBe('Ana');
    expect(guardSpreadsheetCell('100%')).toBe('100%');
    expect(guardSpreadsheetCell('')).toBe('');
  });
});

describe('class attendance export', () => {
  it('writes a CSV whose formula-like cells are quoted text', () => {
    const csv = renderClassAttendanceCsv(risky);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"\'-SM001"');
    expect(csv).toContain('"\'=HYPERLINK(""http://evil"")"');
    expect(csv).toContain('"\'+cmd|"" /C calc""!A0"');
    expect(csv).toContain('"\'@SUM(A1)"');
    expect(csv).toContain('" Ana ""N"" Ruiz, Jr."');
    expect(csv).toContain('"100%"');
    expect(csv).toContain('"0%"');
    expect(csv).not.toContain(',=HYPERLINK');
  });

  it('stores spreadsheet cells as text in the xlsx, including a dangerous heading', async () => {
    const buffer = await renderClassAttendanceXlsx(risky, {
      university: '=HYPERLINK("http://evil")',
      faculty: 'Engineering',
      career: '',
      attendanceLine: 'Attendance Software Architecture',
      instructorLine: 'Instructor: Ada',
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.worksheets[0];
    const texts: string[] = [];
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        expect(cell.type).not.toBe(ExcelJS.ValueType.Formula);
        if (typeof cell.value === 'string') texts.push(cell.value);
      });
    });
    expect(texts).toContain('\'=HYPERLINK("http://evil")');
    expect(texts).toContain("'-SM001");
    expect(texts).toContain('\'+cmd|" /C calc"!A0');
    expect(texts).toContain('Engineering');
    expect(texts).not.toContain('=HYPERLINK("http://evil")');
  });

  it('slugs the class name into a file name', () => {
    expect(classAttendanceFileName('Software Architecture', 'csv')).toBe(
      'Software-Architecture.csv',
    );
    expect(classAttendanceFileName('   ', 'xlsx')).toBe('attendance.xlsx');
  });
});
