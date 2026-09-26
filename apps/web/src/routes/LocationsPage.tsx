import {
  createSavedLocationSchema,
  updateSavedLocationSchema,
  type SavedLocationDto,
} from '@attendence-up/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../api/context';
import {
  LocationFields,
  emptyLocation,
  type LocationFormValue,
} from '../components/LocationFields';
import {
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  Field,
  LoadingBlock,
  PageHeader,
  inputClass,
} from '../components/ui';
import { numberOrNan } from '../lib/datetime';

function coordinateLabel(value: number): string {
  return value.toFixed(6);
}

export function LocationsPage() {
  const { t } = useTranslation();
  const api = useApi();
  const queryClient = useQueryClient();
  const locations = useQuery({ queryKey: ['locations'], queryFn: () => api.locations() });
  const [name, setName] = useState('');
  const [draft, setDraft] = useState<LocationFormValue>({ ...emptyLocation(), enabled: true });
  const [nameError, setNameError] = useState<string | undefined>();
  const [locationError, setLocationError] = useState<string | undefined>();
  const [savedNotice, setSavedNotice] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['locations'] });

  const create = useMutation({
    mutationFn: api.createLocation,
    onSuccess: async () => {
      setName('');
      setDraft({ ...emptyLocation(), enabled: true });
      setNameError(undefined);
      setLocationError(undefined);
      setSavedNotice(true);
      await invalidate();
    },
  });

  const rename = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) =>
      api.updateLocation(id, { name: next }),
    onSuccess: async () => {
      setRenameId(null);
      await invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: api.deleteLocation,
    onSuccess: async () => {
      setDeleteId(null);
      await invalidate();
    },
  });

  function addLocation() {
    setSavedNotice(false);
    const parsed = createSavedLocationSchema.safeParse({
      name,
      latitude: numberOrNan(draft.latitude),
      longitude: numberOrNan(draft.longitude),
      radiusMeters: numberOrNan(draft.radiusMeters),
    });
    if (!parsed.success) {
      let nextName: string | undefined;
      let nextLocation: string | undefined;
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'name') nextName = issue.message;
        else nextLocation = issue.message;
      }
      setNameError(nextName);
      setLocationError(nextLocation);
      return;
    }
    setNameError(undefined);
    setLocationError(undefined);
    create.mutate(parsed.data);
  }

  function startRename(item: SavedLocationDto) {
    setDeleteId(null);
    setRenameId(item.id);
    setRenameValue(item.name);
  }

  function saveRename(id: string) {
    const parsed = updateSavedLocationSchema.safeParse({ name: renameValue });
    if (!parsed.success || !parsed.data.name) return;
    rename.mutate({ id, next: parsed.data.name });
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow={t('locations.eyebrow')}
        title={t('locations.title')}
        description={t('locations.description')}
      />
      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {t('locations.addTitle')}
        </h2>
        <form
          className="mt-4 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            addLocation();
          }}
        >
          <Field label={t('locations.name')} hint={t('locations.nameHint')} error={nameError}>
            <input
              className={inputClass}
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <LocationFields
            mode="required"
            picker={false}
            value={draft}
            onChange={setDraft}
            error={locationError}
          />
          {create.isError ? <ErrorBlock error={create.error} /> : null}
          {savedNotice ? <p className="text-sm text-teal">{t('locations.saved')}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? t('common.saving') : t('locations.save')}
            </Button>
          </div>
        </form>
      </Card>

      <section className="mt-6" aria-label={t('locations.title')}>
        {locations.isLoading ? <LoadingBlock label={t('locations.loading')} /> : null}
        {locations.isError ? <ErrorBlock error={locations.error} /> : null}
        {locations.data && locations.data.length === 0 ? (
          <EmptyState
            icon="pin_drop"
            title={t('locations.emptyTitle')}
            body={t('locations.emptyBody')}
          />
        ) : null}
        {locations.data && locations.data.length > 0 ? (
          <Card className="divide-y divide-line">
            {locations.data.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  {renameId === item.id ? (
                    <form
                      className="flex flex-wrap items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        saveRename(item.id);
                      }}
                    >
                      <input
                        className={`${inputClass} sm:w-64`}
                        value={renameValue}
                        maxLength={120}
                        aria-label={t('locations.name')}
                        onChange={(event) => setRenameValue(event.target.value)}
                      />
                      <Button
                        type="submit"
                        disabled={rename.isPending || renameValue.trim() === ''}
                      >
                        {t('locations.saveName')}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setRenameId(null)}>
                        {t('common.cancel')}
                      </Button>
                    </form>
                  ) : (
                    <p className="font-semibold text-ink">{item.name}</p>
                  )}
                  <p className="mt-1 text-sm text-muted">
                    {t('locations.coords', {
                      latitude: coordinateLabel(item.latitude),
                      longitude: coordinateLabel(item.longitude),
                      radius: item.radiusMeters,
                    })}
                  </p>
                </div>
                {renameId !== item.id && (
                  <div className="flex flex-wrap gap-2">
                    {deleteId === item.id ? (
                      <>
                        <span className="text-sm text-muted">{t('locations.confirmDelete')}</span>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(item.id)}
                        >
                          {t('common.delete')}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setDeleteId(null)}>
                          {t('common.keep')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button type="button" variant="secondary" onClick={() => startRename(item)}>
                          {t('locations.rename')}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setDeleteId(item.id)}>
                          {t('common.delete')}
                        </Button>
                      </>
                    )}
                  </div>
                )}
                {rename.isError && renameId === item.id ? (
                  <ErrorBlock error={rename.error} />
                ) : null}
                {remove.isError && deleteId === item.id ? (
                  <ErrorBlock error={remove.error} />
                ) : null}
              </div>
            ))}
          </Card>
        ) : null}
      </section>
    </div>
  );
}
