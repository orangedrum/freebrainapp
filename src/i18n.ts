import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en/common.json";
import es from "./locales/es/common.json";
import de from "./locales/de/common.json";
import pt from "./locales/pt/common.json";

export const SUPPORTED_LANGUAGES = ["en", "es", "de", "pt"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Initializes i18next with browser language detection and all supported translations. */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      de: { translation: de },
      pt: { translation: pt },
    },
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED_LANGUAGES],
    nonExplicitSupportedLngs: true,
    detection: {
      order: ["navigator", "htmlTag", "localStorage"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
    react: {
      useSuspense: false,
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
