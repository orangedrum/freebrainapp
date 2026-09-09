# FreeBrain — Movement Therapy for Your Brain

[app.freethebrains.com](https://app.freethebrains.com) — A React + TypeScript progressive web app for FreeBrain, a neuro-therapy platform offering on-demand movement therapy. Built with Vite, Tailwind CSS, shadcn/ui, react-i18next, and Supabase (auth + Postgres with RLS). Supports three roles — **FreeBrainer**, **BrainLover** (caregiver), **Pro** (facility) — plus an app Admin. Fully internationalized in English, German, Spanish, French, and Portuguese.

## Auth & Email (Magic Links)

- Auth is Supabase (email OTP magic links) — see `src/lib/supabase.ts`.
- **Transactional email is sent by Resend**, configured in the Supabase project under **Authentication → Email → SMTP** (not in this codebase). If magic-link emails stop arriving, check the Resend account / Supabase SMTP settings, not the app code.
- The "Find your FreeBrainer" directory search (name or email lookup during BrainLover onboarding) runs through the `search_profiles` Postgres RPC — `supabase/migrations/41_freebrainer_directory_search.sql`. Run that migration against the project before the search can work in prod.

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
node scripts/check-architecture.js
```

`scripts/check-architecture.js` enforces the Lego-block architecture (no cross-feature imports, no circular dependencies). See `docs/architecture-check.md`.

## Project Architecture

```
src/
├── pages/              ← Slim composition layers (routes). Import sections, not logic.
├── features/           ← Role-specific sections + hooks
│   ├── freebrainer/    ← FreeBrainer dashboard, love page, team roster
│   ├── brainlover/     ← BrainLover dashboard, love-their-brain, profile tabs
│   ├── checkin/        ← Check-in flow (modal, steps, mystery box)
│   ├── community/      ← Community feed hooks
│   ├── pro/            ← Pro dashboard (facility admin)
│   ├── onboarding/     ← Onboarding hooks
│   ├── profile/        ← Profile data hooks
│   ├── sessions/       ← Virtual session hooks
│   └── shared/         ← Cross-role shared features (invite, bulk operations)
├── components/
│   ├── shared/         ← Cross-role UI components (modals, cards, charts)
│   ├── ui/             ← shadcn/ui primitives (DO NOT MODIFY)
│   └── auth/           ← Role guards, auth UI
├── lib/                ← Utilities, Supabase client (+ mock client), dev-bypass, i18n, youtube
├── hooks/              ← Global hooks (PWA, speech, toast)
├── contexts/           ← React contexts (AuthContext)
├── locales/            ← i18n translations (en, de, es, fr, pt)
└── types/              ← TypeScript type definitions (Supabase types)
```

### Key Principles
- **Max 300 lines per file** — split if larger.
- **One concern per file.** Pages compose sections; sections contain logic.
- **No cross-feature imports** — shared logic goes in `src/components/shared/` or `src/lib/`.
- **No hardcoded colors** — use semantic Tailwind tokens referencing CSS custom properties in `src/index.css`.
- **No hardcoded user-facing text** — use `t()` from react-i18next. All 5 locale files must stay in sync.
- **Never modify `src/components/ui/`** — these are shadcn primitives.
- **One code path for dev-bypass and real users** — dev-bypass swaps the Supabase client in `src/lib/supabase.ts`; never branch on role in data hooks.

### Internationalization (i18n)
- 5 languages: English (default), German, Spanish, French, Portuguese
- Browser language auto-detected via `i18next-browser-languagedetector`
- User preference cached in `localStorage`
- Translation files: `src/locales/{en,de,es,fr,pt}.json`

### Design System
- Colors defined as CSS custom properties in `src/index.css` (HSL format)
- Semantic tokens: `--background`, `--foreground`, `--primary`, `--secondary`, `--success`, `--warning`, `--danger`, `--info`, `--gold`
- Fonts: Sora (headings), Manrope (body) — configured in `tailwind.config.ts`

## AI Coding Rules

**`AGENTS.md` is the single source of truth** for AI coding rules. The per-tool rule files defer to it and only summarize the current project:
- **`CLAUDE.md`** — Claude (Anthropic)
- **`.cursorrules`** — Cursor
- **`.github/copilot-instructions.md`** — GitHub Copilot

Read `AGENTS.md` before making any changes.

## Lockfile policy

This repository tracks `package-lock.json`. Commit it alongside dependency changes in `package.json`.