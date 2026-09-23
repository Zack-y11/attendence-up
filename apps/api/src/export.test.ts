import { DEFAULT_EXPORT_COLUMN_IDS, resolveExportColumns } from '@attendence-up/shared';
import { describe, expect, it } from 'vitest';
import { buildExportTable } from '@attendence-up/shared';

describe('resolveExportColumns', () => {
  it('uses the default columns, excluding coordinates, when none are requested', () => {
    expect(resolveExportColumns(undefined)).toEqual(DEFAULT_EXPORT_COLUMN_IDS);
    expect(resolveExportColumns(undefined)).not.toContain('latitude');
    expect(resolveExportColumns(undefined)).not.toContain('longitude');
  });

  it('ignores unknown columns and keeps allowlist order', () => {
    expect(resolveExportColumns('longitude,not-a-column,studentCode')).toEqual([
      'studentCode',
      'longitude',
    ]);
  });

  it('returns an empty selection when every requested column is unknown', () => {
    expect(resolveExportColumns('secret,password')).toEqual([]);
  });
});

describe('buildExportTable', () => {
  it('formats distance, accuracy, and labels without raw coordinates unless selected', () => {
    const table = buildExportTable({
      columns: ['studentName', 'distance', 'accuracy', 'locationStatus'],
      sessionName: 'September 23',
      className: 'Software Architecture',
      timeZone: 'UTC',
      records: [
        {
          studentCode: 'SM001',
          studentName: 'Juan Pérez',
          signature: null,
          createdAt: '2026-09-23T14:03:00.000Z',
          distanceFromSessionMeters: 24.2,
          locationAccuracyMeters: 8,
          locationStatus: 'WITHIN_RADIUS',
          attendanceStatus: 'PRESENT',
          latitude: 13.69,
          longitude: -89.21,
        },
      ],
    });

    expect(table.headers).toEqual([
      'Student name',
      'Distance',
      'Location accuracy',
      'Location status',
    ]);
    expect(table.rows[0]).toEqual(['Juan Pérez', '24 m', '±8 m', 'Near session']);
  });

  it('labels Present, Late, Absent, and Excused for grading', () => {
    expect(resolveExportColumns(undefined)).toContain('attendanceStatus');
    const table = buildExportTable({
      columns: ['studentCode', 'attendanceStatus'],
      sessionName: 'September 23',
      className: 'Software Architecture',
      timeZone: 'UTC',
      records: [
        {
          studentCode: 'SM001',
          studentName: 'Juan Pérez',
          signature: null,
          createdAt: '2026-09-23T14:03:00.000Z',
          distanceFromSessionMeters: null,
          locationAccuracyMeters: null,
          locationStatus: 'NO_EXPECTED_LOCATION',
          attendanceStatus: 'PRESENT',
          latitude: null,
          longitude: null,
        },
        {
          studentCode: 'SM002',
          studentName: 'Ana López',
          signature: null,
          createdAt: '2026-09-23T14:11:00.000Z',
          distanceFromSessionMeters: null,
          locationAccuracyMeters: null,
          locationStatus: 'NO_EXPECTED_LOCATION',
          attendanceStatus: 'LATE',
          latitude: null,
          longitude: null,
        },
        {
          studentCode: 'SM003',
          studentName: 'Luis Gómez',
          signature: null,
          createdAt: '2026-09-23T14:12:00.000Z',
          distanceFromSessionMeters: null,
          locationAccuracyMeters: null,
          locationStatus: 'NO_EXPECTED_LOCATION',
          attendanceStatus: 'ABSENT',
          latitude: null,
          longitude: null,
        },
        {
          studentCode: 'SM004',
          studentName: 'María Díaz',
          signature: null,
          createdAt: '2026-09-23T14:13:00.000Z',
          distanceFromSessionMeters: null,
          locationAccuracyMeters: null,
          locationStatus: 'NO_EXPECTED_LOCATION',
          attendanceStatus: 'EXCUSED',
          latitude: null,
          longitude: null,
        },
      ],
    });

    expect(table.headers).toEqual(['Student code', 'Attendance status']);
    expect(table.rows).toEqual([
      ['SM001', 'Present'],
      ['SM002', 'Late'],
      ['SM003', 'Absent'],
      ['SM004', 'Excused'],
    ]);
  });
});
