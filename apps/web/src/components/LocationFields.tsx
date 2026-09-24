import type { LocationDto } from '@attendence-up/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalizedMessage } from '../i18n/known';
import { Button, Field, Icon, inputClass } from './ui';

const PRESETS = ['200', '300', '500'];

export type LocationFormValue = {
  enabled: boolean;
  latitude: string;
  longitude: string;
  radiusMeters: string;
};

export function emptyLocation(): LocationFormValue {
  return { enabled: false, latitude: '', longitude: '', radiusMeters: '200' };
}

export function locationFromDto(location: LocationDto | null | undefined): LocationFormValue {
  if (!location) return emptyLocation();
  return {
    enabled: true,
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    radiusMeters: String(location.radiusMeters),
  };
}

export function LocationFields({
  value,
  onChange,
  error,
}: {
  value: LocationFormValue;
  onChange: (value: LocationFormValue) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  const localize = useLocalizedMessage();
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const preset = PRESETS.includes(value.radiusMeters);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoMessage(t('location.unsupported'));
      return;
    }
    setGeoMessage(t('location.requesting'));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          ...value,
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

  return (
    <fieldset className="rounded-xl border border-line bg-paper p-4">
      <legend className="flex items-center gap-1.5 px-1 text-xs font-semibold tracking-wider text-muted uppercase">
        <Icon name="my_location" className="text-[16px] text-teal" />
        {t('location.title')}
      </legend>
      <label className="mt-1 flex items-start gap-2.5 text-sm text-muted">
        <input
          type="checkbox"
          className="mt-0.5 h-[18px] w-[18px] rounded accent-accent"
          checked={value.enabled}
          onChange={(event) => onChange({ ...value, enabled: event.target.checked })}
        />
        <span>{t('location.hint')}</span>
      </label>
      {value.enabled && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t('location.latitude')}>
            <input
              className={inputClass}
              inputMode="decimal"
              value={value.latitude}
              onChange={(event) => onChange({ ...value, latitude: event.target.value })}
            />
          </Field>
          <Field label={t('location.longitude')}>
            <input
              className={inputClass}
              inputMode="decimal"
              value={value.longitude}
              onChange={(event) => onChange({ ...value, longitude: event.target.value })}
            />
          </Field>
          <Field label={t('location.radius')} hint={t('location.radiusHint')}>
            <select
              className={inputClass}
              value={preset ? value.radiusMeters : 'custom'}
              onChange={(event) => {
                if (event.target.value !== 'custom') {
                  onChange({ ...value, radiusMeters: event.target.value });
                } else if (preset) {
                  onChange({ ...value, radiusMeters: '250' });
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
                onChange={(event) => onChange({ ...value, radiusMeters: event.target.value })}
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
        </div>
      )}
      {error && <p className="mt-3 text-sm text-danger">{localize(error)}</p>}
    </fieldset>
  );
}
