# FreeBrain — AI Coding Rules

> **Read `AGENTS.md` first — it is the single source of truth for all coding rules.**
> This file only summarizes the current project so context loads fast.

## Project

FreeBrain (app.freethebrains.com) is a **PWA movement-therapy platform**, not just a marketing site. React 18 + TypeScript 5 + Vite 7 + Tailwind CSS 3 + shadcn/ui + react-i18next + react-router-dom + **Supabase** (auth, Postgres + RLS). Vite PWA runs in silent `autoUpdate` mode (no user-facing update prompts).

Roles: **FreeBrainer**, **BrainLover** (caregiver), **Pro** (facility), plus an app **Admin**. i18n in **5 languages**: en, de, es, fr, pt.

## Quick Rules

1. **Max 300 lines per file.** One concern per file. Pages are slim composition layers.
2. Feature code lives in `src/features/<role>/` — `freebrainer`, `brainlover`, `checkin`, `community`, `pro`, `onboarding`, `profile`, `sessions`, `shared`.
3. **No cross-feature imports** — route through `src/components/shared/` or `src/lib/` (enforced by `node scripts/check-architecture.js`).
4. **No hardcoded colors** — use semantic tokens (`bg-background`, `text-foreground`, `text-primary`, `bg-success`, ...) defined in `src/index.css`.
5. **No hardcoded user-facing text** — use `t()` from react-i18next; add keys to **ALL 5** locale files `src/locales/{en,de,es,fr,pt}.json`.
6. **No dead code, no commented-out blocks, no `console.log`** (use `console.warn` with `[FB-DEBUG]` prefix for debugging).
7. **No `any` type.** Before refactoring, verify all imports resolve and no props are dropped — never regress existing functionality.
8. **Never modify `src/components/ui/`** — shadcn primitives.
9. **One code path for dev-bypass and real users** — branch only via the Supabase client swap in `src/lib/supabase.ts`, never with `isDevBypassUser()` inside data hooks.
10. **Customize role UI via props, never by duplicating components.**

Full rules, architecture, dev-bypass pattern, i18n, PWA strategy and the check-in flow state machine: **see `AGENTS.md`.**