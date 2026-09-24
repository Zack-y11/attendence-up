import { enUS, esCR, esES, esMX, esUY } from '@clerk/localizations';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { es } from './es';

export const LANGUAGE_STORAGE_KEY = 'attendence-up.language';

const ready = i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  fallbackLng: 'en',
  supportedLngs: ['en', 'es'],
  load: 'languageOnly',
  interpolation: { escapeValue: false },
  detection: {
    order: ['querystring', 'localStorage', 'navigator'],
    caches: [],
    lookupQuerystring: 'lng',
    lookupLocalStorage: LANGUAGE_STORAGE_KEY,
  },
});

export function setAppLanguage(language: 'en' | 'es') {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  const url = new URL(window.location.href);
  if (language === 'es') url.searchParams.set('lng', 'es');
  else url.searchParams.delete('lng');
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) window.history.replaceState(window.history.state, '', next);
  return i18n.changeLanguage(language);
}

void ready.then(() => applyDocumentLanguage());

export function applyDocumentLanguage() {
  const language = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  document.documentElement.lang = language.startsWith('es') ? 'es' : 'en';
}

i18n.on('languageChanged', applyDocumentLanguage);
if (i18n.isInitialized) applyDocumentLanguage();

export function clerkLocalization() {
  const language = (i18n.resolvedLanguage ?? i18n.language ?? 'en').toLowerCase();
  if (!language.startsWith('es')) return enUS;
  const region = navigator.language.toLowerCase();
  if (region.startsWith('es-mx')) return esMX;
  if (region.startsWith('es-cr')) return esCR;
  if (region.startsWith('es-uy')) return esUY;
  return esES;
}

export default i18n;
