import { formatAttendancePercentage, type ClassStudentAttendanceDto } from '@attendence-up/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../api/context';
import {
  Button,
  Card,
  ErrorBlock,
  Icon,
  LoadingBlock,
  SectionTitle,
  tableHeadClass,
  tdClass,
  thClass,
  trClass,
} from './ui';

type SortKey = 'studentCode' | 'studentName' | 'attended' | 'total' | 'percentage';
type SortDirection = 'asc' | 'desc';

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function compareStudents(
  a: ClassStudentAttendanceDto,
  b: ClassStudentAttendanceDto,
  key: SortKey,
  direction: SortDirection,
): number {
  const sign = direction === 'asc' ? 1 : -1;
  if (key === 'percentage') {
    if (a.percentage == null && b.percentage == null)
      return compareText(a.studentCode, b.studentCode);
    if (a.percentage == null) return 1;
    if (b.percentage == null) return -1;
    const diff = a.percentage - b.percentage;
    return diff === 0 ? compareText(a.studentCode, b.studentCode) : diff * sign;
  }
  const diff =
    key === 'studentCode' || key === 'studentName' ? compareText(a[key], b[key]) : a[key] - b[key];
  return diff === 0 ? compareText(a.studentCode, b.studentCode) : diff * sign;
}

export function ClassAttendanceSection({ classId }: { classId: string }) {
  const { t, i18n } = useTranslation();
  const api = useApi();
  const attendance = useQuery({
    queryKey: ['class-attendance', classId],
    queryFn: () => api.classAttendance(classId),
  });
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'studentCode',
    direction: 'asc',
  });
  const [pending, setPending] = useState(false);
  const [exportError, setExportError] = useState<unknown>(null);
  const rows = useMemo(() => {
    const students = attendance.data?.students ?? [];
    return [...students].sort((a, b) => compareStudents(a, b, sort.key, sort.direction));
  }, [attendance.data?.students, sort.direction, sort.key]);

  function toggle(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );
  }

  async function download(format: 'csv' | 'xlsx') {
    setPending(true);
    setExportError(null);
    try {
      const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es';
      const file = await api.exportClassAttendance(classId, format, locale);
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error);
    } finally {
      setPending(false);
    }
  }

  const hintKey = attendance.data?.excusedCountsInDenominator
    ? 'classDetail.attendanceHintCounted'
    : 'classDetail.attendanceHintOmitted';

  return (
    <section>
      <SectionTitle
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => download('csv')}
              disabled={pending}
            >
              <Icon name="download" className="text-[18px]" />
              {t('export.csv')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => download('xlsx')}
              disabled={pending}
            >
              <Icon name="download" className="text-[18px]" />
              {t('export.excel')}
            </Button>
          </div>
        }
      >
        {t('classDetail.attendance')}
      </SectionTitle>
      {attendance.data ? (
        <p className="-mt-1 mb-3 max-w-3xl text-sm text-muted">
          {t(hintKey, { count: attendance.data.closedSessionCount })}
        </p>
      ) : null}
      {exportError ? (
        <div className="mb-3">
          <ErrorBlock error={exportError} />
        </div>
      ) : null}
      {attendance.isLoading ? <LoadingBlock label={t('classDetail.loadingAttendance')} /> : null}
      {attendance.isError ? <ErrorBlock error={attendance.error} /> : null}
      {attendance.data && rows.length === 0 ? (
        <Card className="px-4 py-8 text-center text-sm text-muted">
          <Icon name="group_off" className="mb-1 block text-[22px]" />
          {t('classDetail.emptyAttendance')}
        </Card>
      ) : null}
      {attendance.data && rows.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <SortHeader
                    label={t('table.studentCode')}
                    sortKey="studentCode"
                    sort={sort}
                    onSort={toggle}
                  />
                  <SortHeader
                    label={t('table.studentName')}
                    sortKey="studentName"
                    sort={sort}
                    onSort={toggle}
                    title={t('classDetail.nameLastSeen')}
                  />
                  <SortHeader
                    label={t('table.attended')}
                    sortKey="attended"
                    sort={sort}
                    onSort={toggle}
                    align="right"
                  />
                  <SortHeader
                    label={t('table.total')}
                    sortKey="total"
                    sort={sort}
                    onSort={toggle}
                    align="right"
                  />
                  <SortHeader
                    label={t('table.percentage')}
                    sortKey="percentage"
                    sort={sort}
                    onSort={toggle}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.studentCode} className={trClass}>
                    <td className={`${tdClass} font-semibold tabular-nums`}>{row.studentCode}</td>
                    <td className={tdClass}>{row.studentName}</td>
                    <td className={`${tdClass} text-right font-semibold tabular-nums`}>
                      {row.attended}
                    </td>
                    <td className={`${tdClass} text-right tabular-nums text-muted`}>{row.total}</td>
                    <td className={`${tdClass} text-right font-semibold tabular-nums`}>
                      {row.percentage == null
                        ? t('classDetail.percentageUnavailable')
                        : formatAttendancePercentage(row.percentage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </section>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
  title,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; direction: SortDirection };
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
  title?: string;
}) {
  const active = sort.key === sortKey;
  const icon = !active
    ? 'unfold_more'
    : sort.direction === 'asc'
      ? 'arrow_upward'
      : 'arrow_downward';
  return (
    <th
      className={thClass}
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        title={title}
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 ${align === 'right' ? 'w-full justify-end' : ''}`}
      >
        {label}
        <Icon name={icon} className="text-[14px]" />
      </button>
    </th>
  );
}
