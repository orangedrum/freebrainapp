# FreeBrain — AI Coding Rules & Architecture Guide

> **Read this before making ANY change.** Every rule below is non-negotiable.
> These rules apply to Claude, Cursor, Copilot, and any other AI coding tool.

---

## Project Overview

FreeBrain (freethebrains.com) is a React + TypeScript + Vite + Tailwind CSS + shadcn/ui marketing site for a neuro-therapy platform. It is fully internationalized (English, Spanish, German, Portuguese) with browser language auto-detection. The site is frontend-only — no backend code runs.

### Tech Stack
- **React 18** + **TypeScript 5**
- **Vite 5** (build tool)
- **Tailwind CSS 3** (styling)
- **shadcn/ui** (component primitives — DO NOT modify `src/components/ui/`)
- **react-i18next** (i18n — 4 languages)
- **react-router-dom** (routing)
- **lucide-react** (icons)

---

## Architecture Rules (Non-Negotiable)

### Modular Structure
```
src/
├── pages/          ← Slim composition layers (routes). Import sections, not logic.
├── features/       ← Feature-specific sections + hooks
│   └── home/       ← Home page sections (Hero, Footer sections, etc.)
├── components/
│   ├── shared/     ← Cross-feature UI components (modals, cards, etc.)
│   ├── ui/         ← UI primitives (DO NOT modify)
│   └── layout/     ← Layout, Header, Footer
├── lib/            ← Utilities, constants, helpers
├── hooks/          ← Global hooks
├── locales/        ← i18n translation files
│   ├── en/common.json
│   ├── es/common.json
│   ├── de/common.json
│   └── pt/common.json
└── types/          ← TypeScript type definitions
```

### File Size & Organization
- **Max 300 lines per file.** Split if larger.
- **One concern per file.**
- **Pages are slim** — they import and compose sections, they do NOT contain business logic.
- **Sections live in `src/features/<feature>/`** (e.g., `src/features/home/HeroSection.tsx`).
- **Shared components live in `src/components/shared/`**.
- **Cross-feature imports must go through `src/components/shared/` or `src/lib/`** — never import directly from another feature folder.

### Clean Code
- **Meaningful, descriptive names.** No abbreviations unless widely understood.
- **No dead code.** No commented-out blocks. Remove unused imports and variables.
- **No `console.log`** in production code.
- **No `any` type** — always use proper TypeScript types.

### Human-Readable
- Code should read like prose. Prefer clarity over cleverness.
- Use **early returns** to flatten nested conditionals.
- Name functions as **verbs** (`fetchCheckIns`, `submitCheckIn`).
- Name booleans as **questions** (`hasCheckedIn`, `isLoading`).

### Non-Redundant
- **Never duplicate logic.** If a component or hook already exists, reuse it.
- Before creating any file, check if similar logic already exists.
- If two files do similar things, extract shared logic into a third file and have both import it.

### Never Regressive
- **Never break existing functionality** when refactoring.
- If refactoring, verify all import paths resolve and no props are dropped.
- If renaming a file, update ALL imports that reference it.
- Never remove a prop from a component without checking all call sites.

### Role-Specific Customization via Props, Not Branches
- Never duplicate a component for a different role/user type.
- Customize per-role behavior via props (e.g., `perspective: "self" | "proxy"`).
- Gate role-specific steps at the page/orchestrator level, not inside step components.

---

## Design System Rules

### Colors — CSS Custom Properties Only
- **NEVER hardcode colors** (`text-white`, `bg-blue-500`, `#hex`, `rgb()`).
- All colors are defined as CSS custom properties in `src/index.css`.
- Use semantic Tailwind classes that reference tokens: `bg-background`, `text-foreground`, `bg-primary`, `bg-secondary`, `bg-success`, `bg-warning`, `bg-danger`, `bg-info`, `bg-gold`.
- Brand tokens: `--brand-primary`, `--brand-accent` (#DE1261), `--brand-pink` (#FAAFCC).

### Fonts
- Fonts are configured in `tailwind.config.ts`, not inline in components.

### Layout
- Use `container` with `mx-auto px-4 md:px-6` for page-level sections.
- Section spacing: `py-20 md:py-32` for major sections.
- Max width: `max-w-4xl` (896px) for focused content sections.

---

## i18n Rules — All 4 Languages Required

### Translation Function
- **Every user-facing string** must use the `t()` function from `react-i18next`.
- Never hardcode user-facing text in components.
- Translation files live in `src/locales/{en,es,de,pt}/common.json`.

### When Adding or Changing Text
1. Add the key to `src/locales/en/common.json` first.
2. Add the same key to `es`, `de`, and `pt` common.json files.
3. Use the key in the component via `t("section.key")`.
4. **All 4 language files must stay in sync** — never update one without the others.

### Supported Languages
- `en` — English (default/fallback)
- `es` — Spanish
- `de` — German
- `pt` — Portuguese

### Language Detection
- Browser language is auto-detected via `i18next-browser-languagedetector`.
- Detection order: `navigator` → `htmlTag` → `localStorage`.
- User choice is cached in `localStorage` under `i18nextLng`.
- The floating `LanguageSwitcher` component lets users override the detected language.

---

## Never-Do List

- ❌ Hardcode colors (`text-white`, `bg-blue-500`, `#hex`)
- ❌ Hardcode user-facing text strings (use `t()` translation function)
- ❌ Duplicate a component or hook that already exists
- ❌ Create a file over 300 lines without splitting
- ❌ Import from one feature folder into another (use `shared/` or `lib/`)
- ❌ Duplicate a component for a different role — parameterize with props instead
- ❌ Comment out code instead of deleting it
- ❌ Break existing functionality during refactoring
- ❌ Define React components inside other component functions
- ❌ Import a component file that doesn't exist yet
- ❌ Use `console.log` in production code
- ❌ Use `any` type — always use proper TypeScript types
- ❌ Modify files in `src/components/ui/` — these are shadcn primitives

---

## Trace Before Touching
- Before making any change, **trace the actual code path** a real user hits.
- If there are dev/preview vs production code paths, fix BOTH together — never just one.

## Refactor Instead of Stacking Fallbacks
- If adding a 3rd fallback to the same function, **stop and refactor** instead.
- Identify the single source of truth for each piece of data.
- Centralize shared logic into a single utility function and have ALL callers use it.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/pages/Index.tsx` | Home page — slim composition of all sections |
| `src/i18n.ts` | i18next initialization + language detection |
| `src/index.css` | Design tokens (colors, spacing, fonts) |
| `tailwind.config.ts` | Tailwind theme config (fonts, colors, animations) |
| `src/lib/constants.ts` | Shared constants (links, social URLs, etc.) |
| `src/lib/navigation.ts` | Navigation structure |
| `src/hooks/useModalState.ts` | Modal open/close state management |
| `src/components/shared/Modal.tsx` | Reusable modal dialog |
| `src/components/shared/GridBackground.tsx` | Grid pattern background |
| `src/components/shared/LanguageSwitcher.tsx` | Floating language switcher |
| `src/components/shared/ErrorBoundary.tsx` | Error boundary for crash protection |

---

## Verification Checklist (Before Committing)

1. `npm run build` passes with no errors
2. `npx tsc --noEmit` passes with no type errors
3. All 4 locale files (`en`, `es`, `de`, `pt`) are in sync
4. No hardcoded colors or user-facing strings
5. No file exceeds 300 lines
6. No imports from one feature folder into another
7. No new `console.log` statements
8. All imports resolve correctly
