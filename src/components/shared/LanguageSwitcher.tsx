import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  pt: "Português",
};

const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  en: "🇺🇸",
  es: "🇲🇽",
  de: "🇩🇪",
  pt: "🇧🇷",
};

/** Floating language switcher — fixed bottom-right, toggles between all supported languages. */
export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLanguage = i18n.language as SupportedLanguage;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeLanguage = (language: SupportedLanguage) => {
    i18n.changeLanguage(language);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
    >
      {isOpen && (
        <div className="flex w-44 flex-col rounded-lg border border-border bg-card p-1 shadow-lg">
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language}
              onClick={() => changeLanguage(language)}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-card-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{LANGUAGE_FLAGS[language]}</span>
                {LANGUAGE_LABELS[language]}
              </span>
              {language === currentLanguage && (
                <Check className="h-4 w-4 text-foreground" />
              )}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change language"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <Globe className="h-5 w-5" />
      </button>
    </div>
  );
};
