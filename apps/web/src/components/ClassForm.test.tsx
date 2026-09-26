import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

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

describe('ClassForm meeting time', () => {
  it('asks for the hour and keeps an existing clock time', () => {
    const html = renderToStaticMarkup(
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
