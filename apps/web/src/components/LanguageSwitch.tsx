import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '../i18n';

const options = [
  { code: 'en', short: 'EN', nameKey: 'language.english' },
  { code: 'es', short: 'ES', nameKey: 'language.spanish' },
] as const;

export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? 'en').toLowerCase().startsWith('es') ? 'es' : 'en';

  return (
    <div className="inline-flex rounded-lg bg-mist p-0.5" role="group" aria-label={t('language.label')}>
      {options.map((option) => {
        const selected = current === option.code;
        return (
          <button
            key={option.code}
            type="button"
            aria-pressed={selected}
            aria-label={t(option.nameKey)}
            onClick={() => void setAppLanguage(option.code)}
            className={`rounded-md px-2 py-1 text-xs font-semibold tracking-wide transition ${
              selected ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {option.short}
          </button>
        );
      })}
    </div>
  );
}
