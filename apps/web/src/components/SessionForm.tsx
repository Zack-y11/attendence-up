import { sessionWriteSchema, type LocationDto, type SessionWriteInput } from '@attendence-up/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { fromDatetimeLocal, numberOrNan, toDatetimeLocal } from '../lib/datetime';
import { LocationFields, locationFromDto, type LocationFormValue } from './LocationFields';
import { Button, ErrorBlock, Field, inputClass } from './ui';

type SessionFormValues = {
  name: string;
  description: string;
  attendanceOpensAt: string;
  attendanceClosesAt: string;
};

export function SessionForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
}: {
  initial?: {
    name: string;
    description: string;
    attendanceOpensAt: string | null;
    attendanceClosesAt: string | null;
    location: LocationDto | null;
  };
  submitLabel: string;
  pending: boolean;
  error?: unknown;
  onSubmit: (values: SessionWriteInput) => void;
}) {
  const form = useForm<SessionFormValues>({
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      attendanceOpensAt: toDatetimeLocal(initial?.attendanceOpensAt ?? null),
      attendanceClosesAt: toDatetimeLocal(initial?.attendanceClosesAt ?? null),
    },
  });
  const [location, setLocation] = useState<LocationFormValue>(locationFromDto(initial?.location));
  const [formError, setFormError] = useState<string | undefined>();

  function handleSubmit(values: SessionFormValues) {
    const parsed = sessionWriteSchema.safeParse({
      name: values.name,
      description: values.description,
      attendanceOpensAt: fromDatetimeLocal(values.attendanceOpensAt),
      attendanceClosesAt: fromDatetimeLocal(values.attendanceClosesAt),
      location: location.enabled
        ? {
            latitude: numberOrNan(location.latitude),
            longitude: numberOrNan(location.longitude),
            radiusMeters: numberOrNan(location.radiusMeters),
          }
        : null,
    });
    if (!parsed.success) {
      setFormError(undefined);
      let locationMessage: string | undefined;
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (
          key === 'name' ||
          key === 'description' ||
          key === 'attendanceOpensAt' ||
          key === 'attendanceClosesAt'
        ) {
          form.setError(key, { message: issue.message });
        } else {
          locationMessage = issue.message;
        }
      }
      setFormError(locationMessage);
      return;
    }
    setFormError(undefined);
    onSubmit(parsed.data);
  }

  return (
    <form className="grid max-w-2xl gap-5" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
      {error ? <ErrorBlock error={error} /> : null}
      <Field label="Name" error={form.formState.errors.name?.message}>
        <input className={inputClass} {...form.register('name')} />
      </Field>
      <Field label="Description" error={form.formState.errors.description?.message}>
        <textarea className={`${inputClass} min-h-24`} {...form.register('description')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Attendance opens" hint="Leave blank to allow check-in whenever the session is open.">
          <input type="datetime-local" className={inputClass} {...form.register('attendanceOpensAt')} />
        </Field>
        <Field label="Attendance closes" error={form.formState.errors.attendanceClosesAt?.message}>
          <input type="datetime-local" className={inputClass} {...form.register('attendanceClosesAt')} />
        </Field>
      </div>
      <LocationFields value={location} onChange={setLocation} error={formError} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
