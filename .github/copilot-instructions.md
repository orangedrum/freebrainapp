# FreeBrain — GitHub Copilot Instructions

> **Read `AGENTS.md` first — it is the single source of truth for all coding rules.**

## Project

FreeBrain (app.freethebrains.com) is a **PWA movement-therapy platform**. React 18 + TypeScript 5 + Vite 7 + Tailwind CSS 3 + shadcn/ui + react-i18next + react-router-dom + **Supabase** (auth, Postgres + RLS). Roles: **FreeBrainer**, **BrainLover** (caregiver), **Pro** (facility), plus app **Admin**. i18n in **5 languages**: en, de, es, fr, pt.

## Quick Rules

1. Max 300 lines per file; one concern per file; pages are slim composition layers.
2. Feature code in `src/features/<role>/` (`freebrainer`, `brainlover`, `checkin`, `community`, `pro`, `onboarding`, `profile`, `sessions`, `shared`).
3. No cross-feature imports — use `src/components/shared/` or `src/lib/` (enforced by `node scripts/check-architecture.js`).
4. No hardcoded colors — use semantic Tailwind tokens from `src/index.css`.
5. No hardcoded user-facing text — use `t()` from react-i18next; update ALL 5 locale files `src/locales/{en,de,es,fr,pt}.json`.
6. No dead code, no commented-out blocks, no `console.log` (debug via `console.warn` with `[FB-DEBUG]`).
7. No `any`. Verify imports/props on refactors; never break existing functionality.
8. Never define React components inside other components.
9. Never modify `src/components/ui/`.
10. One code path for dev-bypass and real users — branch only via the Supabase client swap in `src/lib/supabase.ts`, never `isDevBypassUser()` in data hooks.
11. Customize role UI via props, never by duplicating components.

## Verification

```bash
npm run build
npx tsc --noEmit
npm run lint
node scripts/check-architecture.js
```

Full rules: **`AGENTS.md`**.