import { EXPORT_COLUMNS, type ExportColumnId } from '@attendence-up/shared';
import { useState } from 'react';
import { ApiError } from '../api/client';
import { useApi } from '../api/context';
import { Button, ErrorBlock } from './ui';

export function ExportDialog({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const api = useApi();
  const [format, setFormat] = useState<'xlsx' | 'pdf'>('xlsx');
  const [columns, setColumns] = useState<ExportColumnId[]>(
    EXPORT_COLUMNS.filter((column) => column.defaultSelected).map((column) => column.id),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  function toggle(id: ExportColumnId) {
    setColumns((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function download() {
    if (columns.length === 0) {
      setError(new ApiError(400, 'Select at least one column.'));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        format,
        columns: columns.join(','),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-card p-5 shadow-[0_20px_25px_-5px_rgba(15,23,42,0.08)]">
        <h2 className="font-display text-xl font-semibold tracking-tight">Download attendance</h2>
        <p className="mt-1 text-sm text-muted">
          Coordinates stay off unless you select them. Distance and status are enough for most reports.
        </p>
        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Format</legend>
          <div className="mt-2 flex gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="format"
                checked={format === 'xlsx'}
                onChange={() => setFormat('xlsx')}
              />
              Excel
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="format" checked={format === 'pdf'} onChange={() => setFormat('pdf')} />
              PDF
            </label>
          </div>
        </fieldset>
        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Columns</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {EXPORT_COLUMNS.map((column) => (
              <label key={column.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={columns.includes(column.id)}
                  onChange={() => toggle(column.id)}
                />
                {column.label}
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
            Cancel
          </Button>
          <Button type="button" onClick={download} disabled={pending}>
            {pending ? 'Preparing…' : 'Download'}
          </Button>
        </div>
      </div>
    </div>
  );
}
