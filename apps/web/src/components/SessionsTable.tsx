import type { SessionStatus } from '@attendence-up/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { formatClock, formatWhen } from '../lib/datetime';
import { paths } from '../lib/paths';
import { Card, Icon, StatusPill, sessionTone, tableHeadClass, tdClass, thClass, trClass } from './ui';

export type SessionRow = {
  id: string;
  name: string;
  status: SessionStatus;
  attendanceCount: number;
  createdAt: string;
  className?: string | null;
  startsAt?: string | null;
  attendanceOpensAt?: string | null;
};

export function SessionsTable({
  rows,
  showClass = true,
  empty,
}: {
  rows: SessionRow[];
  showClass?: boolean;
  empty: string;
}) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return (
      <Card className="px-4 py-8 text-center text-sm text-muted">
        <Icon name="event_busy" className="mb-1 block text-[22px]" />
        {empty}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className={tableHeadClass}>
            <tr>
              <th className={thClass}>{t('table.session')}</th>
              {showClass && <th className={thClass}>{t('table.class')}</th>}
              <th className={thClass}>{t('table.scheduled')}</th>
              <th className={`${thClass} text-right`}>{t('table.checkIns')}</th>
              <th className={thClass}>{t('table.status')}</th>
              <th className={`${thClass} text-right`}>{t('table.action')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={trClass}>
                <td className={tdClass}>
                  <Link to={paths.session(row.id)} className="font-semibold text-ink hover:text-accent">
                    {row.name}
                  </Link>
                  <span className="block text-xs text-muted">{t('common.created', { when: formatWhen(row.createdAt) })}</span>
                </td>
                {showClass && (
                  <td className={`${tdClass} whitespace-nowrap`}>
                    {row.className ? (
                      <span className="rounded-md bg-accent-soft/60 px-2 py-0.5 text-xs font-semibold text-accent">
                        {row.className}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">{t('common.standalone')}</span>
                    )}
                  </td>
                )}
                <td className={`${tdClass} whitespace-nowrap text-muted`}>
                  {row.attendanceOpensAt
                    ? formatWhen(row.attendanceOpensAt)
                    : formatClock(row.startsAt ?? null)}
                </td>
                <td className={`${tdClass} text-right font-semibold tabular-nums`}>{row.attendanceCount}</td>
                <td className={tdClass}>
                  <StatusPill tone={sessionTone(row.status)}>{t(`status.session.${row.status}`)}</StatusPill>
                </td>
                <td className={`${tdClass} text-right`}>
                  <Link
                    to={paths.session(row.id)}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition ${
                      row.status === 'OPEN'
                        ? 'bg-accent-soft text-accent hover:bg-accent hover:text-white'
                        : 'text-muted hover:bg-mist hover:text-ink'
                    }`}
                  >
                    {row.status === 'OPEN' ? t('table.inspectLive') : t('common.view')}
                    <Icon name="chevron_right" className="text-[16px]" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
