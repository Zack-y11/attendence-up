import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AttendanceRecordDto } from '@attendence-up/shared';
import { en } from '../i18n/en';
import { es } from '../i18n/es';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      if (key === 'export.noRecords') return en.export.noRecords;
      if (key === 'export.morePdf')
        return en.export.morePdf_other.replace('{{count}}', String(options?.count ?? 0));
      return key;
    },
  }),
}));

import { PdfSheet } from './ExportDialog';

const heading = {
  university: 'Universidad de El Salvador',
  faculty: 'Facultad de Ingeniería',
  career: 'Ingeniería de Sistemas',
  attendance: 'Asistencia Software Architecture 23 de septiembre de 2026',
  instructor: 'Instructor: Ana Ruiz',
  logo: '/logo.svg',
};

const record: AttendanceRecordDto = {
  id: 'rec-1',
  studentCode: 'SM001',
  studentName: 'María Alejandra Quintanilla Hernández-Solano',
  signature: null,
  latitude: null,
  longitude: null,
  locationAccuracyMeters: null,
  distanceFromSessionMeters: null,
  locationStatus: 'LOCATION_UNAVAILABLE',
  attendanceStatus: 'PRESENT',
  absenceNote: 'Estoy en el trabajo hasta las 5.',
  createdAt: '2026-09-23T14:03:00.000Z',
};

function sheet(headers: string[]) {
  return renderToStaticMarkup(
    <PdfSheet
      heading={heading}
      headers={headers}
      rows={[[record.studentName, record.absenceNote ?? '']]}
      records={[record]}
      signatureColumn={-1}
      hiddenCount={2}
    />,
  );
}

describe('PdfSheet', () => {
  it('shows each student as a labeled block using the existing English and Spanish column names', () => {
    const english = sheet([en.export.columnsById.studentName, en.export.columnsById.absenceNote]);
    const spanish = sheet([es.export.columnsById.studentName, es.export.columnsById.absenceNote]);

    for (const html of [english, spanish]) {
      expect(html).toContain('Universidad de El Salvador');
      expect(html).toContain('Asistencia Software Architecture 23 de septiembre de 2026');
      expect(html).toContain('Instructor: Ana Ruiz');
      expect(html).toContain('María Alejandra Quintanilla Hernández-Solano');
      expect(html).toContain('Estoy en el trabajo hasta las 5.');
      expect(html).toContain('grid-cols-2');
      expect(html).not.toContain('<table');
      expect(html).not.toContain('whitespace-nowrap');
      expect(html).toContain('2 more rows are included in the PDF.');
    }

    expect(english).toContain('Student name');
    expect(english).toContain('Why away');
    expect(spanish).toContain('Nombre del estudiante');
    expect(spanish).toContain('Por qué está fuera');
  });

  it('uses the existing empty-state string', () => {
    const html = renderToStaticMarkup(
      <PdfSheet
        heading={heading}
        headers={[en.export.columnsById.studentName]}
        rows={[]}
        records={[]}
        signatureColumn={-1}
        hiddenCount={0}
      />,
    );
    expect(html).toContain(en.export.noRecords);
    expect(html).not.toContain('<table');
  });
});
