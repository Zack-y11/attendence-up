import { createSavedLocationSchema, type SavedLocationDto } from '@attendence-up/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useApi } from '../api/context';
import { useLocalizedMessage } from '../i18n/known';
import { numberOrNan } from '../lib/datetime';
import { paths } from '../lib/paths';
import { Button, ErrorBlock, Field, Icon, inputClass } from './ui';

const PRESETS = ['200', '300', '500'];

export type LocationFormValue = {
  enabled: boolean;
  latitude: string;
  longitude: string;
  radiusMeters: string;
  savedLocationId: string | null;
};

export function emptyLocation(): LocationFormValue {
  return {
    enabled: false,
    latitude: '',
    longitude: '',
    radiusMeters: '200',
    savedLocationId: null,
  };
}

export function locationFromDto(
  location: { latitude: number; longitude: number; radiusMeters: number } | null | undefined,
): LocationFormValue {
  if (!location) return emptyLocation();
  return {
    enabled: true,
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    radiusMeters: String(location.radiusMeters),
    savedLocationId: null,
  };
}

export function LocationFields({
  value,
  onChange,
  error,
  mode = 'optional',
  picker = true,
}: {
  value: LocationFormValue;
  onChange: (value: LocationFormValue) => void;
  error?: string;
  mode?: 'optional' | 'required';
  picker?: boolean;
}) {
  const { t } = useTranslation();
  const localize = useLocalizedMessage();
  const api = useApi();
  const queryClient = useQueryClient();
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveError, setSaveError] = useState<unknown>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const matchedOnce = useRef(false);
  const preset = PRESETS.includes(value.radiusMeters);
  const showFields = mode === 'required' || value.enabled;
  const saved = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.locations(),
    enabled: picker,
  });

  useEffect(() => {
    if (!picker || !saved.data || matchedOnce.current) return;
    matchedOnce.current = true;
    if (value.savedLocationId) return;
    if (value.latitude.trim() === '' || value.longitude.trim() === '') return;
    const latitude = Number(value.latitude);
    const longitude = Number(value.longitude);
    const radiusMeters = Number(value.radiusMeters);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(radiusMeters))
      return;
    const hit = saved.data.find(
      (item) =>
        item.latitude === latitude &&
        item.longitude === longitude &&
        item.radiusMeters === radiusMeters,
    );
    if (!hit) return;
    onChange({ ...value, enabled: true, savedLocationId: hit.id });
  }, [onChange, picker, saved.data, value]);

  function edit(patch: Partial<LocationFormValue>) {
    setSavedNotice(false);
    onChange({ ...value, ...patch, savedLocationId: null });
  }

  function pick(id: string) {
    setSavedNotice(false);
    if (!id) {
      onChange({ ...value, savedLocationId: null });
      return;
    }
    const item = saved.data?.find((entry) => entry.id === id);
    if (!item) return;
    onChange({
      enabled: true,
      latitude: String(item.latitude),
      longitude: String(item.longitude),
      radiusMeters: String(item.radiusMeters),
      savedLocationId: item.id,
    });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoMessage(t('location.unsupported'));
      return;
    }
    setGeoMessage(t('location.requesting'));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        edit({
          enabled: true,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        });
        setGeoMessage(t('location.accuracy', { meters: Math.round(position.coords.accuracy) }));
      },
      () => setGeoMessage(t('location.denied')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  const createSaved = useMutation({
    mutationFn: api.createLocation,
    onSuccess: async (created) => {
      queryClient.setQueryData<SavedLocationDto[]>(['locations'], (current) => {
        const list = current ?? [];
        if (list.some((item) => item.id === created.id)) return list;
        return [...list, created].sort((a, b) => a.name.localeCompare(b.name));
      });
      await queryClient.invalidateQueries({ queryKey: ['locations'] });
      onChange({
        enabled: true,
        latitude: String(created.latitude),
        longitude: String(created.longitude),
        radiusMeters: String(created.radiusMeters),
        savedLocationId: created.id,
      });
      setSaveName('');
      setSaveError(null);
      setSavedNotice(true);
    },
  });

  function saveThisLocation() {
    setSavedNotice(false);
    const parsed = createSavedLocationSchema.safeParse({
      name: saveName,
      latitude: numberOrNan(value.latitude),
      longitude: numberOrNan(value.longitude),
      radiusMeters: numberOrNan(value.radiusMeters),
    });
    if (!parsed.success) {
      setSaveError(new Error(parsed.error.issues[0]?.message ?? t('errors.checkForm')));
      return;
    }
    setSaveError(null);
    createSaved.mutate(parsed.data);
  }

  const manual = showFields && !value.savedLocationId;

  return (
    <fieldset className="rounded-xl border border-line bg-paper p-4">
      <legend className="flex items-center gap-1.5 px-1 text-xs font-semibold tracking-wider text-muted uppercase">
        <Icon name="my_location" className="text-[16px] text-teal" />
        {t('location.title')}
      </legend>
      {mode === 'optional' ? (
        <label className="mt-1 flex items-start gap-2.5 text-sm text-muted">
          <input
            type="checkbox"
            className="mt-0.5 h-[18px] w-[18px] rounded accent-accent"
            checked={value.enabled}
            onChange={(event) =>
              onChange({
                ...value,
                enabled: event.target.checked,
                savedLocationId: event.target.checked ? value.savedLocationId : null,
              })
            }
          />
          <span>{t('location.hint')}</span>
        </label>
      ) : (
        <p className="mt-1 text-sm text-muted">{t('location.hint')}</p>
      )}
      {picker && (
        <div className="mt-4 grid gap-2">
          {saved.isError ? <ErrorBlock error={saved.error} /> : null}
          {saved.data && saved.data.length > 0 ? (
            <Field label={t('location.picker')}>
              <select
                className={inputClass}
                value={value.savedLocationId ?? ''}
                onChange={(event) => pick(event.target.value)}
              >
                <option value="">{t('location.pickerPlaceholder')}</option>
                {saved.data.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {t('location.meters', { count: item.radiusMeters })}
                  </option>
                ))}
              </select>
            </Field>
          ) : saved.isError ? null : (
            <p className="text-sm text-muted">
              {saved.isLoading ? t('locations.loading') : t('location.noneSaved')}
            </p>
          )}
          <Link to={paths.locations} className="text-sm font-medium text-accent hover:underline">
            {t('location.manage')}
          </Link>
        </div>
      )}
      {showFields && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t('location.latitude')}>
            <input
              className={inputClass}
              inputMode="decimal"
              value={value.latitude}
              onChange={(event) => edit({ latitude: event.target.value })}
            />
          </Field>
          <Field label={t('location.longitude')}>
            <input
              className={inputClass}
              inputMode="decimal"
              value={value.longitude}
              onChange={(event) => edit({ longitude: event.target.value })}
            />
          </Field>
          <Field label={t('location.radius')} hint={t('location.radiusHint')}>
            <select
              className={inputClass}
              value={preset ? value.radiusMeters : 'custom'}
              onChange={(event) => {
                if (event.target.value !== 'custom') {
                  edit({ radiusMeters: event.target.value });
                } else if (preset) {
                  edit({ radiusMeters: '250' });
                }
              }}
            >
              {PRESETS.map((meters) => (
                <option key={meters} value={meters}>
                  {t('location.meters', { count: Number(meters) })}
                </option>
              ))}
              <option value="custom">{t('location.custom')}</option>
            </select>
          </Field>
          {!preset && (
            <Field label={t('location.customRadius')}>
              <input
                className={inputClass}
                inputMode="numeric"
                value={value.radiusMeters}
                onChange={(event) => edit({ radiusMeters: event.target.value })}
              />
            </Field>
          )}
          <div className="sm:col-span-2">
            <Button type="button" variant="secondary" onClick={useCurrentLocation}>
              <Icon name="near_me" className="text-[18px]" />
              {t('location.useCurrent')}
            </Button>
            {geoMessage && <p className="mt-2 text-sm text-muted">{geoMessage}</p>}
          </div>
          {picker && manual && (
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label={t('location.saveName')} hint={t('location.saveNameHint')}>
                <input
                  className={inputClass}
                  value={saveName}
                  maxLength={120}
                  onChange={(event) => setSaveName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      saveThisLocation();
                    }
                  }}
                />
              </Field>
              <Button
                type="button"
                variant="secondary"
                onClick={saveThisLocation}
                disabled={createSaved.isPending || saveName.trim() === ''}
              >
                {createSaved.isPending ? t('common.saving') : t('location.saveThis')}
              </Button>
            </div>
          )}
        </div>
      )}
      {savedNotice && <p className="mt-3 text-sm text-teal">{t('location.saved')}</p>}
      {(saveError || createSaved.error) && (
        <div className="mt-3">
          <ErrorBlock error={saveError ?? createSaved.error} />
        </div>
      )}
      {error && <p className="mt-3 text-sm text-danger">{localize(error)}</p>}
    </fieldset>
  );
}
