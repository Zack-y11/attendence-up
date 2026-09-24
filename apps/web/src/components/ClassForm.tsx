import { createClassSchema, type CreateClassInput, type LocationDto } from '@attendence-up/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { fromDatetimeLocal, numberOrNan, toDatetimeLocal } from '../lib/datetime';
import { LocationFields, locationFromDto, type LocationFormValue } from './LocationFields';
import { Button, ErrorBlock, Field, inputClass } from './ui';

type ClassFormValues = {
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
};

export function ClassForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
}: {
  initial?: {
    name: string;
    description: string;
    location: LocationDto | null;
    startsAt: string | null;
    endsAt: string | null;
  };
  submitLabel: string;
  pending: boolean;
  error?: unknown;
  onSubmit: (values: CreateClassInput) => void;
}) {
  const { t } = useTranslation();
  const form = useForm<ClassFormValues>({
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      startsAt: toDatetimeLocal(initial?.startsAt ?? null),
      endsAt: toDatetimeLocal(initial?.endsAt ?? null),
    },
  });
  const [location, setLocation] = useState<LocationFormValue>(locationFromDto(initial?.location));
  const [locationError, setLocationError] = useState<string | undefined>();

  function handleSubmit(values: ClassFormValues) {
    const parsed = createClassSchema.safeParse({
      name: values.name,
      description: values.description,
      startsAt: fromDatetimeLocal(values.startsAt),
      endsAt: fromDatetimeLocal(values.endsAt),
      location: location.enabled
        ? {
            latitude: numberOrNan(location.latitude),
            longitude: numberOrNan(location.longitude),
            radiusMeters: numberOrNan(location.radiusMeters),
          }
        : null,
    });
    if (!parsed.success) {
      setLocationError(undefined);
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'name' || key === 'description' || key === 'startsAt' || key === 'endsAt') {
          form.setError(key, { message: issue.message });
        } else {
          setLocationError(issue.message);
        }
      }
      return;
    }
    setLocationError(undefined);
    onSubmit(parsed.data);
  }

  return (
    <form className="grid max-w-2xl gap-5" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
      {error ? <ErrorBlock error={error} /> : null}
      <Field label={t('form.name')} error={form.formState.errors.name?.message}>
        <input className={inputClass} {...form.register('name')} />
      </Field>
      <Field label={t('form.description')} error={form.formState.errors.description?.message}>
        <textarea className={`${inputClass} min-h-28`} {...form.register('description')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('form.starts')} hint={t('form.startsHint')}>
          <input type="datetime-local" className={inputClass} {...form.register('startsAt')} />
        </Field>
        <Field label={t('form.ends')} error={form.formState.errors.endsAt?.message}>
          <input type="datetime-local" className={inputClass} {...form.register('endsAt')} />
        </Field>
      </div>
      <LocationFields value={location} onChange={setLocation} error={locationError} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t('common.saving') : submitLabel}
        </Button>
      </div>
    </form>
  );
}
