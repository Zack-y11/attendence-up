import {
  EXPORT_COLUMNS,
  buildExportTable,
  isSignatureImage,
  resolveExportColumns,
  type AttendanceRecordDto,
  type ExportColumnId,
} from '@attendence-up/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../api/client';
import { useApi } from '../api/context';
import { Button, ErrorBlock } from './ui';

const PREVIEW_ROWS = 8;

export function ExportDialog({
  sessionId,
  sessionName,
  className,
  attendanceOpensAt,
  records,
  onClose,
}: {
  sessionId: string;
  sessionName: string;
  className: string | null;
  attendanceOpensAt: string | null;
  records: AttendanceRecordDto[];
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const api = useApi();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.me() });
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es';
  const headingDate = attendanceOpensAt
    ? new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'es', { dateStyle: 'long', timeZone }).format(
        new Date(attendanceOpensAt),
      )
    : '';
  const attendanceWord = locale === 'en' ? 'Attendance' : 'Asistencia';
  const instructorName = me.data?.printName || me.data?.displayName || '';
  const heading = {
    university: me.data?.university ?? '',
    faculty: me.data?.faculty ?? '',
    career: me.data?.career ?? '',
    attendance: [attendanceWord, className || sessionName, headingDate].filter(Boolean).join(' '),
    instructor: instructorName ? `Instructor: ${instructorName}` : '',
    logo: me.data?.logo || '/logo.svg',
  };
  const [format, setFormat] = useState<'xlsx' | 'pdf'>('xlsx');
  const [columns, setColumns] = useState<ExportColumnId[]>(
    EXPORT_COLUMNS.filter((column) => column.defaultSelected).map((column) => column.id),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const ordered = columns.length === 0 ? [] : resolveExportColumns(columns.join(','));
  const table = useMemo(
    () =>
      buildExportTable({
        columns: ordered,
        sessionName,
        className,
        timeZone,
        records,
      }),
    [ordered, sessionName, className, timeZone, records],
  );
  const signatureColumn = ordered.indexOf('signature');
  const previewRecords = records.slice(0, PREVIEW_ROWS);
  const previewRows = table.rows.slice(0, PREVIEW_ROWS);
  const previewHeaders = ordered.map((id) => t(`export.columnsById.${id}`));

  function toggle(id: ExportColumnId) {
    setColumns((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
    setError(null);
  }

  async function download() {
    if (columns.length === 0) {
      setError(new ApiError(400, t('export.selectColumn')));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        format,
        columns: columns.join(','),
        timezone: timeZone,
        locale,
      });
      const file = await api.exportAttendance(sessionId, params);
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (downloadError) {
      setError(downloadError);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center [&_input]:accent-accent">
      <div className="grid max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-xl border border-line bg-card shadow-[0_20px_25px_-5px_rgba(15,23,42,0.08)] lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="flex max-h-[90vh] flex-col overflow-y-auto border-b border-line p-5 lg:border-r lg:border-b-0">
          <h2 className="font-display text-xl font-semibold tracking-tight">{t('export.title')}</h2>
          <p className="mt-1 text-sm text-muted">{t('export.body')}</p>
          <fieldset className="mt-4">
            <legend className="text-sm font-medium">{t('export.format')}</legend>
            <div className="mt-2 flex gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="format" checked={format === 'xlsx'} onChange={() => setFormat('xlsx')} />
                {t('export.excel')}
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="format" checked={format === 'pdf'} onChange={() => setFormat('pdf')} />
                {t('export.pdf')}
              </label>
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="text-sm font-medium">{t('export.columns')}</legend>
            <div className="mt-2 grid gap-2">
              {EXPORT_COLUMNS.map((column) => (
                <label key={column.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={columns.includes(column.id)}
                    onChange={() => toggle(column.id)}
                  />
                  {t(`export.columnsById.${column.id}`)}
                </label>
              ))}
            </div>
          </fieldset>
          {error ? (
            <div className="mt-4">
              <ErrorBlock error={error} />
            </div>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={download} disabled={pending || columns.length === 0}>
              {pending ? t('common.preparing') : t('common.download')}
            </Button>
          </div>
        </div>
        <div className="max-h-[50vh] overflow-auto bg-paper p-4 lg:max-h-[90vh] lg:p-6">
          <p className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">
            {format === 'xlsx' ? t('export.excelPreview') : t('export.pdfPreview')}
            {ordered.length > 6 && format === 'pdf' ? ` · ${t('export.landscape')}` : ''}
          </p>
          {ordered.length === 0 ? (
            <p className="text-sm text-muted">{t('export.selectColumn')}</p>
          ) : format === 'pdf' ? (
            <PdfSheet
              heading={heading}
              headers={previewHeaders}
              rows={previewRows}
              records={previewRecords}
              signatureColumn={signatureColumn}
              hiddenCount={Math.max(records.length - previewRows.length, 0)}
            />
          ) : (
            <ExcelSheet
              heading={heading}
              headers={previewHeaders}
              rows={previewRows}
              records={previewRecords}
              signatureColumn={signatureColumn}
              hiddenCount={Math.max(records.length - previewRows.length, 0)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewCell({
  value,
  signature,
  blank,
}: {
  value: string;
  signature: string | null;
  blank: string;
}) {
  if (signature && isSignatureImage(signature)) {
    return <img src={signature} alt="" className="h-7 max-w-[7.5rem] object-contain" />;
  }
  return <span>{value || blank}</span>;
}

type PrintHeading = {
  university: string;
  faculty: string;
  career: string;
  attendance: string;
  instructor: string;
  logo: string;
};

function HeadingLines({ heading, excel = false }: { heading: PrintHeading; excel?: boolean }) {
  const lines = [heading.university, heading.faculty, heading.career, heading.attendance, heading.instructor].filter(
    (line) => line.trim() !== '',
  );
  if (lines.length === 0) return null;
  return (
    <div className={excel ? 'border-b border-[#d4d4d4] bg-white px-3 py-3' : ''}>
      {lines.map((line, index) => {
        const isAttendance = line === heading.attendance;
        const isInstructor = line === heading.instructor;
        return (
          <p
            key={`${index}-${line}`}
            className={
              isAttendance || isInstructor
                ? `text-left text-xs text-[#1c2430] ${isAttendance ? 'font-bold' : 'font-normal'}`
                : `text-center text-[#1c2430] ${line === heading.university ? 'text-sm font-bold' : 'text-xs font-semibold'}`
            }
          >
            {line}
          </p>
        );
      })}
    </div>
  );
}

function ExcelSheet({
  heading,
  headers,
  rows,
  records,
  signatureColumn,
  hiddenCount,
}: {
  heading: PrintHeading;
  headers: string[];
  rows: string[][];
  records: AttendanceRecordDto[];
  signatureColumn: number;
  hiddenCount: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="overflow-hidden rounded-lg border border-[#d4d4d4] bg-white shadow-card">
      <HeadingLines heading={heading} excel />
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-[#f3f3f3]">
              {headers.map((header) => (
                <th key={header} className="border border-[#d4d4d4] px-2 py-1.5 font-bold whitespace-nowrap text-[#1c2430]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-[#5c6675]" colSpan={headers.length}>
                  {t('export.noRecords')}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={records[rowIndex]?.id ?? rowIndex} className="h-9">
                  {row.map((value, columnIndex) => (
                    <td key={`${rowIndex}-${columnIndex}`} className="border border-[#e5e5e5] px-2 py-1 whitespace-nowrap text-[#1c2430]">
                      <PreviewCell
                        value={value}
                        signature={columnIndex === signatureColumn ? (records[rowIndex]?.signature ?? null) : null}
                        blank=""
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-[#d4d4d4] bg-[#f3f3f3] px-3 py-1.5 text-[11px] font-medium text-[#5c6675]">
        {t('export.sheet')}
        {hiddenCount > 0 ? ` · ${t('export.moreRows', { count: hiddenCount })}` : ''}
      </div>
    </div>
  );
}

function PdfSheet({
  heading,
  headers,
  rows,
  records,
  signatureColumn,
  hiddenCount,
}: {
  heading: PrintHeading;
  headers: string[];
  rows: string[][];
  records: AttendanceRecordDto[];
  signatureColumn: number;
  hiddenCount: number;
}) {
  const { t } = useTranslation();
  const institution = [heading.university, heading.faculty, heading.career].filter((line) => line.trim() !== '');
  return (
    <div className={`mx-auto bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.12)] ${headers.length > 6 ? 'max-w-none' : 'max-w-3xl'}`}>
      <div className="flex items-center gap-4">
        <img src={heading.logo} alt="" className="h-16 w-16 shrink-0 rounded-xl object-contain" />
        <div className="min-w-0 flex-1 text-center">
          {institution.map((line, index) => (
            <p key={line} className={index === 0 ? 'text-sm font-bold text-[#1c2430]' : 'text-xs font-semibold text-[#1c2430]'}>
              {line}
            </p>
          ))}
        </div>
      </div>
      <div className="mt-3 text-left">
        <p className="text-xs font-bold text-[#1c2430]">{heading.attendance}</p>
        {heading.instructor ? <p className="text-xs font-normal text-[#1c2430]">{heading.instructor}</p> : null}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-[11px]">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} className="border-b border-[#e4ddd0] px-1.5 py-1 font-bold whitespace-nowrap text-[#1c2430]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-1.5 py-2 text-[#5c6675]" colSpan={headers.length}>
                  {t('export.noRecords')}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={records[rowIndex]?.id ?? rowIndex}>
                  {row.map((value, columnIndex) => (
                    <td key={`${rowIndex}-${columnIndex}`} className="border-b border-[#e4ddd0] px-1.5 py-1 whitespace-nowrap text-[#1c2430]">
                      <PreviewCell
                        value={value}
                        signature={columnIndex === signatureColumn ? (records[rowIndex]?.signature ?? null) : null}
                        blank="—"
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {hiddenCount > 0 ? (
        <p className="mt-3 text-[11px] text-[#5c6675]">{t('export.morePdf', { count: hiddenCount })}</p>
      ) : null}
    </div>
  );
}
