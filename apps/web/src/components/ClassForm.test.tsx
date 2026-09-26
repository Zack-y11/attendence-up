import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../api/client';
import { ApiClientProvider } from '../api/context';

vi.mock('../i18n', () => ({
  default: { resolvedLanguage: 'es', language: 'es' },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        {
          'form.name': 'Nombre',
          'form.description': 'Descripción',
          'form.starts': 'Empieza',
          'form.ends': 'Termina',
          'form.startsHint': 'Hora habitual. Se mantiene cada semana. El día se define en cada sesión.',
          'common.saving': 'Guardando',
          'location.title': 'Ubicación',
          'location.hint': 'Ubicación',
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

import { ClassForm } from './ClassForm';
import { fromTimeLocal } from '../lib/meeting-time';

function renderForm(form: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const api = { locations: async () => [] } as unknown as ApiClient;
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ApiClientProvider client={api}>{form}</ApiClientProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ClassForm meeting time', () => {
  it('asks for the hour and keeps an existing clock time', () => {
    const html = renderForm(
      <ClassForm
        initial={{
          name: 'Intro',
          description: '',
          location: null,
          startsAt: fromTimeLocal('08:00'),
          endsAt: fromTimeLocal('09:30'),
        }}
        submitLabel="Guardar"
        pending={false}
        onSubmit={() => {}}
      />,
    );
    expect(html.match(/type="time"/g)).toHaveLength(2);
    expect(html).not.toContain('datetime-local');
    expect(html).toContain('Hora habitual');
  });
});
