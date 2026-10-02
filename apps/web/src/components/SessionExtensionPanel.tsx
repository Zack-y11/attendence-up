import type { AttendanceExtensionInviteDto } from '@attendence-up/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../api/context';
import { formatWhen } from '../lib/datetime';
import { publicAttendanceUrl } from '../lib/publicAttendanceUrl';
import { useCopy } from '../lib/useCopy';
import { Button, ErrorBlock, Field, Icon, inputClass } from './ui';

export function SessionExtensionPanel({
  sessionId,
  origin,
}: {
  sessionId: string;
  origin: string;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const queryClient = useQueryClient();
  const { copied, error: copyError, copy } = useCopy();
  const [studentCode, setStudentCode] = useState('');
  const [lastCopiedId, setLastCopiedId] = useState<string | null>(null);

  const invites = useQuery({
    queryKey: ['extension-invites', sessionId],
    queryFn: () => api.extensionInvites(sessionId),
  });

  const create = useMutation({
    mutationFn: () =>
      api.createExtensionInvite(sessionId, {
        studentCode: studentCode.trim(),
      }),
    onSuccess: async (invite) => {
      setStudentCode('');
      await queryClient.invalidateQueries({ queryKey: ['extension-invites', sessionId] });
      const url = publicAttendanceUrl(origin, invite.publicPath);
      setLastCopiedId(invite.id);
      await copy(url);
    },
  });

  const revoke = useMutation({
    mutationFn: (inviteId: string) => api.revokeExtensionInvite(sessionId, inviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['extension-invites', sessionId] });
    },
  });

  const active = (invites.data ?? []).filter(isActiveInvite);

  return (
    <div className="mt-6 border-t border-line pt-5">
      <p className="text-xs font-semibold tracking-wider text-muted uppercase">
        {t('session.extensionTitle')}
      </p>
      <p className="mt-1 text-sm text-muted">{t('session.extensionHint')}</p>
      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <div className="min-w-0 flex-1">
          <Field label={t('session.extensionStudentCode')}>
          <input
            className={inputClass}
            value={studentCode}
            onChange={(event) => setStudentCode(event.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
          />
          </Field>
        </div>
        <Button type="submit" disabled={create.isPending || !studentCode.trim()}>
          {t('session.extensionCreate')}
        </Button>
      </form>
      {create.error ? (
        <div className="mt-3">
          <ErrorBlock error={create.error} />
        </div>
      ) : null}
      {copied && lastCopiedId ? (
        <p className="mt-2 text-sm text-teal">{t('session.extensionCopied')}</p>
      ) : null}
      {copyError ? <p className="mt-2 text-sm text-danger">{t('errors.copyFailed')}</p> : null}
      {invites.isLoading ? (
        <p className="mt-4 text-sm text-muted">{t('common.loading')}</p>
      ) : active.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{t('session.extensionEmpty')}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {active.map((invite) => (
            <InviteRow
              key={invite.id}
              invite={invite}
              origin={origin}
              onCopy={() => {
                setLastCopiedId(invite.id);
                void copy(publicAttendanceUrl(origin, invite.publicPath));
              }}
              onRevoke={() => revoke.mutate(invite.id)}
              revoking={revoke.isPending}
              expiresLabel={formatWhen(invite.expiresAt)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function isActiveInvite(invite: AttendanceExtensionInviteDto) {
  if (invite.usedAt) return false;
  return new Date(invite.expiresAt).getTime() > Date.now();
}

function InviteRow({
  invite,
  origin,
  onCopy,
  onRevoke,
  revoking,
  expiresLabel,
}: {
  invite: AttendanceExtensionInviteDto;
  origin: string;
  onCopy: () => void;
  onRevoke: () => void;
  revoking: boolean;
  expiresLabel: string;
}) {
  const { t } = useTranslation();
  const url = publicAttendanceUrl(origin, invite.publicPath);
  return (
    <li className="rounded-lg border border-line bg-paper px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-semibold text-ink">{invite.studentCode}</p>
        <p className="text-xs text-muted">{t('session.extensionExpires', { when: expiresLabel })}</p>
      </div>
      <p className="mt-1 truncate font-mono text-xs text-muted">{url}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onCopy}>
          <Icon name="content_copy" className="text-[18px]" />
          {t('session.extensionCopy')}
        </Button>
        <Button type="button" variant="ghost" onClick={onRevoke} disabled={revoking}>
          {t('session.extensionRevoke')}
        </Button>
      </div>
    </li>
  );
}
