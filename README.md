# FreeBrain — Movement Therapy for Your Brain

[app.freethebrains.com](https://app.freethebrains.com) — A React + TypeScript marketing site for FreeBrain, a neuro-therapy platform offering on-demand movement therapy. Built with Vite, Tailwind CSS, shadcn/ui, and full internationalization (English, Spanish, German, Portuguese).

## Requirements

- Node.js 18+ (LTS recommended)
- npm

## Getting started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

## Available scripts

- `npm run dev` - start Vite in development mode
- `npm run build` - create a production build
- `npm run build:dev` - create a development-mode build
- `npm run preview` - preview the production build locally
- `npm run lint` - run ESLint checks
- `npm run test` - run Vitest tests once
- `npm run test:watch` - run Vitest in watch mode

## Verification commands

```bash
npm run lint
npm run test
npm run build
npx tsc --noEmit
```

## Project Architecture

```
src/
├── pages/          ← Slim composition layers (routes). Import sections, not logic.
├── features/       ← Feature-specific sections + hooks
│   └── home/       ← Home page sections (Hero, Conditions, OnDemand, etc.)
├── components/
│   ├── shared/     ← Cross-feature UI components (Modal, GridBackground, etc.)
│   ├── ui/         ← shadcn/ui primitives (DO NOT MODIFY)
│   └── layout/     ← Header, Footer
├── lib/            ← Utilities, constants, navigation config
├── hooks/          ← Global hooks (useModalState, useScrollY, etc.)
├── locales/        ← i18n translation files
│   ├── en/common.json
│   ├── es/common.json
│   ├── de/common.json
│   └── pt/common.json
└── types/          ← TypeScript type definitions
```

### Key Principles
- **Max 300 lines per file** — split if larger.
- **One concern per file.** Pages compose sections; sections contain logic.
- **No cross-feature imports** — shared logic goes in `src/components/shared/` or `src/lib/`.
- **No hardcoded colors** — use semantic Tailwind tokens referencing CSS custom properties in `src/index.css`.
- **No hardcoded user-facing text** — use `t()` from react-i18next. All 4 locale files must stay in sync.
- **Never modify `src/components/ui/`** — these are shadcn primitives.

### Internationalization (i18n)
- 4 languages: English (default), Spanish, German, Portuguese
- Browser language auto-detected via `i18next-browser-languagedetector`
- User preference cached in `localStorage`
- Floating `LanguageSwitcher` component for manual override
- Translation files: `src/locales/{en,es,de,pt}/common.json`

### Design System
- Colors defined as CSS custom properties in `src/index.css` (HSL format)
- Brand tokens: `--brand-primary` (#3F3CD5), `--brand-accent` (#DE1261), `--brand-pink` (#FAAFCC)
- Semantic tokens: `--background`, `--foreground`, `--primary`, `--secondary`, `--success`, `--warning`, `--danger`, `--info`, `--gold`
- Fonts configured in `tailwind.config.ts`

## AI Coding Rules

This project includes AI rules files for all major AI coding tools:
- **`CLAUDE.md`** — Claude (Anthropic)
- **`.cursorrules`** — Cursor
- **`.github/copilot-instructions.md`** — GitHub Copilot

All three contain the same non-negotiable architecture rules. Read the relevant file before making any changes.

## Lockfile policy

This repository does not track `package-lock.json`.
