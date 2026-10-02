import { DEFAULT_EXPORT_COLUMN_IDS, buildExportTable } from '@attendence-up/shared';
import zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { renderAttendancePdf } from './attendance-pdf';

const SIGNATURE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC',
  'base64',
);

const heading = {
  university: 'Universidad de El Salvador',
  faculty: 'Facultad de Ingenieria',
  career: 'Ingenieria de Sistemas Informaticos',
  attendanceLine: 'Asistencia Software Architecture 23 de septiembre de 2026',
  instructorLine: 'Instructor: Ana Ruiz',
  logo: null,
};

function pdfContents(buffer: Buffer): string {
  const latin = buffer.toString('latin1');
  const chunks: string[] = [];
  for (const match of latin.matchAll(/\/Length (\d+)[\s\S]*?stream\r?\n/g)) {
    const length = Number(match[1]);
    const start = match.index + match[0].length;
    const raw = Buffer.from(latin.slice(start, start + length), 'latin1');
    try {
      chunks.push(zlib.inflateSync(raw).toString('latin1'));
    } catch {
      chunks.push(raw.toString('latin1'));
    }
  }
  return chunks.join('\n');
}

function decodePdfLiteral(body: string): string {
  let out = '';
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char !== '\\') {
      out += char;
      continue;
    }
    const next = body[(index += 1)];
    if (next === undefined) break;
    if (next === 'n') out += '\n';
    else if (next === 'r') out += '\r';
    else if (next === 't') out += '\t';
    else if (next === '(' || next === ')' || next === '\\') out += next;
    else if (next >= '0' && next <= '7') {
      let octal = next;
      for (let extra = 0; extra < 2; extra += 1) {
        const digit = body[index + 1];
        if (digit === undefined || digit < '0' || digit > '7') break;
        octal += digit;
        index += 1;
      }
      out += String.fromCharCode(Number.parseInt(octal, 8));
    } else out += next;
  }
  return out;
}

function pdfText(buffer: Buffer): string {
  const content = pdfContents(buffer);
  const lines: string[] = [];
  for (const block of content.split('ET')) {
    const body = block.split('BT').pop() ?? '';
    const parts: string[] = [];
    for (const match of body.matchAll(/<([0-9A-Fa-f]+)>/g)) {
      parts.push(Buffer.from(match[1], 'hex').toString('latin1'));
    }
    for (const match of body.matchAll(/\((?:\\.|[^\\)])*\)/g)) {
      parts.push(decodePdfLiteral(match[0].slice(1, -1)));
    }
    if (parts.length > 0) lines.push(parts.join(''));
  }
  return lines.join('\n');
}

function pdfPlain(buffer: Buffer): string {
  return pdfText(buffer).replace(/\s+/g, ' ');
}

function pdfPageCount(buffer: Buffer): number {
  const counts = [...buffer.toString('latin1').matchAll(/\/Count (\d+)/g)].map((match) =>
    Number(match[1]),
  );
  return counts.length > 0 ? Math.max(...counts) : 0;
}

describe('renderAttendancePdf', () => {
  it('keeps the university header and prints each field in full inside the table', async () => {
    const longName = 'Maria Alejandra Quintanilla Hernandez-Solano';
    const longNote =
      'I am at work until 5 because the lab shift runs through the whole afternoon session.';
    const table = buildExportTable({
      columns: DEFAULT_EXPORT_COLUMN_IDS,
      sessionName: 'September 23',
      className: 'Software Architecture',
      timeZone: 'UTC',
      records: [
        {
          studentCode: 'SM-0001-EXTRA-LONG-IDENTIFIER',
          studentName: longName,
          signature: 'data:image/png;base64,abc',
          createdAt: '2026-09-23T14:03:00.000Z',
          distanceFromSessionMeters: 24.2,
          locationAccuracyMeters: 8,
          locationStatus: 'WITHIN_RADIUS',
          attendanceStatus: 'EXCUSED',
          absenceNote: longNote,
          latitude: null,
          longitude: null,
        },
      ],
    });

    const pdf = await renderAttendancePdf({
      heading,
      columns: DEFAULT_EXPORT_COLUMN_IDS,
      headers: table.headers,
      rows: table.rows,
      signatures: [SIGNATURE_PNG],
      signatureColumn: table.headers.indexOf('Signature'),
    });
    const text = pdfPlain(pdf);

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(text).toContain('Universidad de El Salvador');
    expect(text).toContain('Facultad de Ingenieria');
    expect(text).toContain('Ingenieria de Sistemas Informaticos');
    expect(text).toContain(heading.attendanceLine);
    expect(text).toContain('Instructor: Ana Ruiz');
    expect(text).toContain('Student name');
    expect(text).toMatch(/Locatio[\s\S]*accura/i);
    expect(text).toContain('Why away');
    const compact = text.replace(/[\s-]+/g, '');
    expect(compact).toContain(longName.replace(/[\s-]+/g, ''));
    expect(compact).toContain('SM0001EXTRALONGIDENTIFIER');
    expect(compact).toContain(longNote.replace(/[\s-]+/g, ''));
    expect(text).not.toContain('…');
    expect(pdf.toString('latin1')).toContain('/Subtype /Image');
    expect(pdfPageCount(pdf)).toBe(1);
  });

  it('continues the table on new pages when the roster is longer', async () => {
    const records = Array.from({ length: 8 }, (_, index) => ({
      studentCode: `SM${String(index + 1).padStart(3, '0')}`,
      studentName: `Student Name ${index + 1} Garcia`,
      signature: null,
      createdAt: '2026-09-23T14:03:00.000Z',
      distanceFromSessionMeters: 12,
      locationAccuracyMeters: 6,
      locationStatus: 'WITHIN_RADIUS' as const,
      attendanceStatus: 'PRESENT' as const,
      absenceNote: null,
      latitude: null,
      longitude: null,
    }));
    const table = buildExportTable({
      columns: DEFAULT_EXPORT_COLUMN_IDS,
      sessionName: 'September 23',
      className: 'Software Architecture',
      timeZone: 'UTC',
      records,
    });
    const pdf = await renderAttendancePdf({
      heading,
      columns: DEFAULT_EXPORT_COLUMN_IDS,
      headers: table.headers,
      rows: table.rows,
      signatures: records.map(() => null),
      signatureColumn: table.headers.indexOf('Signature'),
    });
    const text = pdfText(pdf);
    const pages = pdfPageCount(pdf);

    expect(pages).toBeGreaterThanOrEqual(1);
    expect(pages).toBeLessThanOrEqual(4);
    expect(text).toContain('Student Name 1 Garcia');
    expect(text).toContain('Student Name 8 Garcia');
    expect(text).toContain('SM001');
    expect(text).toContain('SM008');
  });

  it('keeps the header and says when there are no records', async () => {
    const pdf = await renderAttendancePdf({
      heading,
      columns: ['studentName'],
      headers: ['Student name'],
      rows: [],
      signatures: [],
      signatureColumn: -1,
    });
    const text = pdfPlain(pdf);
    expect(text).toContain('Universidad de El Salvador');
    expect(text).toContain('No attendance records.');
    expect(pdfPageCount(pdf)).toBe(1);
  });
});
