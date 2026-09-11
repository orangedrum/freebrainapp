import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from '../locales/en.json';
import esTranslations from '../locales/es.json';
import frTranslations from '../locales/fr.json';
import deTranslations from '../locales/de.json';
import ptTranslations from '../locales/pt.json';

import enCommon from '../locales/en/common.json';
import esCommon from '../locales/es/common.json';
import deCommon from '../locales/de/common.json';
import ptCommon from '../locales/pt/common.json';

const merge = (main: Record<string, unknown>, landing: Record<string, unknown>) => {
  const result = { ...main };
  for (const [key, value] of Object.entries(landing)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null
    ) {
      result[key] = merge(result[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: merge(enTranslations, enCommon) },
    es: { translation: merge(esTranslations, esCommon) },
    fr: { translation: frTranslations },
    de: { translation: merge(deTranslations, deCommon) },
    pt: { translation: merge(ptTranslations, ptCommon) },
  },
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'de', 'es', 'fr', 'pt'],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

// Purge stale language preference left by the removed LanguageSwitcher.
try { localStorage.removeItem('i18nextLng'); } catch { /* ignore */ }

export default i18n;