# ADR-003: i18n Translation Strategy

## Status
Accepted

## Context
FreeBrain targets users across multiple countries. Hardcoding English strings in components makes localization impossible and creates maintenance debt when text changes require code edits.

## Decision
Use **i18next + react-i18next** with a 5-locale strategy:

- **Locales:** English (`en`), German (`de`), Spanish (`es`), French (`fr`), Portuguese (`pt`) — files in `src/locales/*.json`.
- **All user-facing strings** must go through `const { t } = useTranslation()` and `t("namespace.key")`.
- **Fallback strings** are allowed inline in `t("key", "Fallback text")` for rapid prototyping, but the locale JSON files are the source of truth.
- **When adding a new string:** add the key to all 5 locale files in the same commit. English is the reference; other languages can be translated later but the key must exist.
- **No string concatenation** for translatable text — use interpolation: `t("greeting", { name: user.name })`.
- Language detection is automatic via `i18next-browser-languagedetector`; user can override in profile settings.

## Consequences
- **Positive:** Any component can be localized without code changes. Adding a language is just a new JSON file. Non-technical translators can work in JSON without touching code.
- **Negative:** Every new user-facing string requires edits to 5 files. Developers may forget non-English locales.
- **Mitigation:** `AGENTS.md` mandates all 5 locale files. ESLint could enforce `t()` usage in future. CI could check for missing keys across locales.
