# AGENTS.md — FreeBrain AI Coding Rules

> **All AI coding tools (Copilot, Cursor, Claude, etc.) MUST read and follow these rules before writing any code.**

---

## 1. Coding Principles (Non-Negotiable)

### Modular
- One concern per file. Max **300 lines** per file — split if larger.
- Extract reusable logic into `src/lib/` or feature-level hooks (`use*.ts`).
- Pages are slim composition layers — they import sections, not logic.
- Sections live in `src/features/<role>/` (e.g., `src/features/freebrainer/`).
- Shared components live in `src/components/shared/`.

### Clean
- Meaningful, descriptive names. No abbreviations unless widely understood.
- No dead code. No commented-out blocks. Remove unused imports and variables.
- No `console.log` in production code (use `console.warn` or `console.error` for debugging only, prefixed with `[FB-DEBUG]`).

### Human-Readable
- Code should read like prose. Prefer clarity over cleverness.
- Use early returns to flatten nested conditionals.
- Name functions as verbs (`fetchCheckIns`, `submitCheckIn`) and booleans as questions (`hasCheckedIn`, `isLoading`).

### Non-Redundant
- **Never duplicate logic.** If a component or hook already exists, reuse it.
- Before creating any new file, check:
  - `src/features/<role>/` — role-specific sections and hooks
  - `src/components/shared/` — cross-role shared components
  - `src/lib/` — utilities and helpers
  - `src/hooks/` — global hooks
- If two files do similar things, extract the shared logic into a third file and have both import it.

### Language-Supported
- All user-facing strings MUST go through `useTranslation()` (from `react-i18next`).
- Translation keys must be added to ALL 5 locale files:
  - `src/locales/en.json`
  - `src/locales/de.json`
  - `src/locales/es.json`
  - `src/locales/fr.json`
  - `src/locales/pt.json`
- Never hardcode English text in JSX. Use `t("namespace.key")`.
- Fallback strings in `t()` calls are allowed but locale files are the source of truth.

### Never Regressive
- Never break existing functionality when refactoring.
- If refactoring, verify all import paths resolve and no props are dropped.
- If renaming a file, update ALL imports that reference it.
- Never remove a prop from a component without checking all call sites.
- Run `tsc --noEmit` mentally (or actually) before finishing — no type errors allowed.

### Trace Before Touching (Critical)
- **Before making any change, trace the actual code path a REAL user hits** — not the dev-bypass/admin preview path.
- The admin "Dev: Switch Role" preview and a real authenticated user can execute different code paths (dev-bypass uses localStorage mocks, real users query Supabase). Always verify which path the bug is on before editing.
- If you fix something on the dev-bypass path but not the real Supabase path (or vice versa), the fix is incomplete. Both paths must be fixed together.
- When a user reports "it works in preview but not in production," the bug is almost always a dev-bypass vs real-user path divergence.

### Refactor Instead of Stacking Fallbacks
- If you are adding a 3rd fallback to the same function, **stop and refactor the function** instead.
- Stacking fallbacks (`if (A) ... else if (B) ... else if (C) ...`) makes code harder to reason about and hides the real failure point.
- Identify the single source of truth for each piece of data and read from there — don't scatter reads across localStorage, user_metadata, URL params, and Supabase with cascading fallbacks.
- Centralize shared logic (e.g., invite sending, name resolution) into a single `src/lib/` function and have ALL callers use it — no exceptions.

### Role-Specific Customization via Props, Not Branches (Critical)
- **Never duplicate a component for a different role.** If the FreeBrainer and BrainLover both use a check-in flow, onboarding step, or card, they share ONE component.
- Customize per-role behavior via **props** (e.g., `perspective: "self" | "proxy"`), not via `if (role === "brainlover")` branches scattered through the component.
- All role-specific strings must use `t()` with a namespace that has both `self.*` and `proxy.*` variants (e.g., `checkin.proxy.moved` vs `checkin.moved`). The component picks the namespace based on the prop.
- If a step or sub-flow is only relevant to one role, gate it at the **page/orchestrator level** (e.g., skip step 5 for invited BrainLovers in `Onboarding.tsx`), not inside the step component.
- **Why:** Duplicating components means fixing a bug in one copy but not the other — the exact regression pattern we keep hitting. One component, parameterized by props, means one fix applies everywhere.

### One Code Path for Dev-Bypass and Real Users (Critical)
- **Dev-bypass and real users MUST run the same code.** The only difference is the data source (localStorage vs Supabase), NOT the logic.
- **NEVER branch with `if (isDevBypassUser()) { ...localStorage... return; }` in hooks or components.** This creates parallel implementations that drift apart — the #1 source of "works in preview, broken in production" bugs.
- Instead, intercept at the Supabase client level: `src/lib/supabase.ts` exports a mock client (same chained API: `.from().select().eq().insert().delete().maybeSingle()`) when in dev-bypass mode, and the real client otherwise.
- All hooks and components use `import { supabase } from "@/lib/supabase"` with zero branching. The mock client transparently reads/writes localStorage using the same table names and column names as Supabase.
- **Migration plan:** Replace all `isDevBypassUser()` branches in data hooks with the mock client. Keep `isDevBypassUser()` ONLY for non-data concerns (e.g., skipping real OTP emails, hiding admin-only buttons).
- If you add a new data hook, it should work identically in dev-bypass and production with NO conditional branches.

---

## 2. Architecture — Lego-Block Model

```
src/
├── pages/              ← Slim composition layers (routes). Import sections, not logic.
├── features/           ← Role-specific sections + hooks
│   ├── freebrainer/    ← FreeBrainer dashboard sections, love page, team roster
│   ├── brainlover/     ← BrainLover dashboard, love-their-brain, profile tabs
│   ├── checkin/        ← Check-in flow (modal, steps, mystery box, keep-moving)
│   ├── community/      ← Community feed hooks
│   ├── pro/            ← Pro dashboard (facility admin)
│   ├── onboarding/     ← Onboarding hooks
│   ├── profile/        ← Profile data hooks
│   ├── sessions/       ← Virtual session hooks
│   └── shared/         ← Cross-role shared features (invite, bulk operations)
├── components/
│   ├── shared/         ← Cross-role UI components (modals, cards, charts)
│   ├── ui/             ← shadcn/ui primitives (DO NOT modify)
│   ├── onboarding/     ← Onboarding step components
│   ├── profile/        ← Profile section components
│   ├── community/      ← Community feed components
│   ├── dashboard/      ← Legacy dashboard components
│   ├── layout/         ← DashboardLayout, nav
│   └── auth/           ← Role guards, auth UI
├── lib/                ← Utilities, Supabase client, dev-bypass, i18n, youtube
├── hooks/              ← Global hooks (PWA, speech, toast)
├── contexts/           ← React contexts (AuthContext)
├── locales/            ← i18n translation files (en, de, es, fr, pt)
└── types/              ← TypeScript type definitions (Supabase types)
```

**Rules:**
- Pages (`src/pages/`) should be under 150 lines. They compose sections.
- Feature folders own their data hooks (`use*.ts`) and section components (`*.tsx`).
- Cross-feature imports must go through `src/components/shared/` or `src/lib/` — never import directly from another feature folder.
- **Architecture is enforced in CI** via `scripts/check-architecture.js` — a zero-dependency script that detects cross-feature imports and circular dependencies. See `docs/architecture-check.md` for details.
- To run locally: `node scripts/check-architecture.js`

---

## 3. Design Token System

- All colors are defined as HSL CSS custom properties in `src/index.css`.
- **NEVER hardcode colors** (e.g., `text-white`, `bg-blue-500`, `#4338ca`).
- Use semantic Tailwind classes that reference tokens:
  - `bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`
  - `bg-primary`, `text-primary-foreground`, `bg-secondary`
  - `bg-success`, `bg-warning`, `bg-danger`, `bg-info`, `bg-gold`
- Semantic status tokens:
  - `--success` → positive states (checked in, streak alive, "Freed My Brain")
  - `--warning` → cautionary states (not checked in, "Tested My Brain")
  - `--danger` → destructive actions (SOS, account deletion)
  - `--info` → neutral informational states ("Rested My Brain")
  - `--gold` → accent highlight (insights chart, sparkles)
- Fonts: `Sora` (headings), `Manrope` (body) — configured in `tailwind.config.ts`.

---

## 4. Dev-Bypass Pattern (Critical for Admin Testing)

The admin can proxy any role via `dev_role_override` in localStorage. This creates a fake user with `id = "dev-user-id"`.

**Architecture: Mock Supabase Client (NOT per-hook branches)**

The dev-bypass works by swapping the Supabase client at the import level. `src/lib/supabase.ts` checks `isDevBypassMode()` and exports either:
- The **real Supabase client** (production users)
- A **mock client** with the same chained API (`.from().select().eq().insert().delete().maybeSingle()`) that reads/writes localStorage (admin proxy)

This means **all hooks and components use the same code** regardless of mode. No `if (isDevBypassUser())` branches in data hooks.

**What `isDevBypassUser()` is still used for (non-data concerns only):**
- Skipping real OTP email sends (don't spam real emails in dev mode)
- Hiding admin-only UI elements
- Deciding whether to seed initial mock data

**What `isDevBypassUser()` must NEVER be used for:**
- Branching data fetch logic (use the mock client instead)
- Conditional localStorage reads in hooks (the mock client handles this)
- Parallel implementations of the same query

**Mock data lives in localStorage under `dev_*` keys** and is seeded by `seedDevCaregiverLinks()` and `createDevSubAccount()`.

**If you see `400 (Bad Request)` with `invalid input syntax for type uuid: "dev-user-id"` in console, the mock client isn't intercepting a query — add the table to the mock client's table map.**

---

## 5. i18n Pattern

- Initialized in `src/lib/i18n.ts` using `i18next` + `i18next-browser-languagedetector`.
- Usage in components:

```typescript
import { useTranslation } from "react-i18next";
const { t } = useTranslation();
// In JSX:
{t("dashboard.title")}
{t("checkin.step1.ready")}
```

- Translation keys use dot notation: `namespace.key` (e.g., `dashboard.title`, `checkin.step1.ready`).
- When adding a new string, add it to ALL 5 locale files simultaneously.
- When updating a string, update it in ALL 5 locale files.
- Locale files are JSON objects with nested namespaces.

---

## 6. PWA Update Strategy

- `vite-plugin-pwa` runs in `autoUpdate` mode — the service worker calls `skipWaiting()` and silently reloads.
- `src/hooks/usePWAUpdate.ts` intercepts reloads during:
  - **Check-in video playback** — deferred until video step is complete
  - **Post creation** — deferred until modal is closed
- **No user-facing update prompts.** Updates are silent. Users are non-technical and debilitated — they should never see "update available" toasts.
- Bundle version is stamped in `src/main.tsx` as `FB_BUNDLE_VERSION` and logged on load for debugging.

---

## 7. Check-In Flow State Machine

The check-in is a multi-step modal:

1. **Movement choice** — "What do you feel up to today?" (video, rest, test)
2. **Time step** — duration slider + video selection + cast-to-TV option
3. **Video step** — YouTube playback (PWA updates deferred here)
4. **Symptom step** — symptom sliders ("Bad" to "Great")
5. **Review step** — summary before submit
6. **Mystery box** — animated reward reveal

**Rules:**
- Modal auto-opens ONCE daily when `hasCheckedInToday` is false.
- After check-in, the modal does NOT reopen — a `KeepMovingCard` appears on the dashboard instead.
- `checkInProgressGlobal(true)` is set ONLY during video playback (step 3), not when the modal opens.
- The `completedCheckInThisSession` flag in `Overview.tsx` prevents re-trigger during the refetch cycle.

---

## 8. Supabase & RLS

- Client initialized in `src/lib/supabase.ts`.
- Database types in `src/types/supabase.ts`.
- Row-Level Security (RLS) is enabled on all tables.
- Migrations live in `supabase/migrations/` — numbered sequentially.
- When adding new tables or columns, create a new migration file (next number in sequence).
- RLS policies must account for:
  - Users reading their own data (`user_id = auth.uid()`)
  - BrainLovers reading their managed FreeBrainers' data (via `caregiver_links` or `managed_freebrainers` join)
  - Admins having full access (via `user_roles` table or email fallback)

---

## 9. File Conventions

- **Components**: PascalCase `.tsx` (e.g., `StreakRatioCard.tsx`)
- **Hooks**: camelCase `use*.ts` (e.g., `useOverviewData.ts`)
- **Utilities**: camelCase `.ts` (e.g., `devBypass.ts`)
- **Pages**: PascalCase `.tsx` in `src/pages/`
- **Locales**: lowercase `.json` in `src/locales/`
- **Migrations**: `NN_description.sql` in `supabase/migrations/`

---

## 10. Never-Do List

- ❌ Hardcode colors (`text-white`, `bg-blue-500`, `#hex`)
- ❌ Hardcode English text in JSX (bypass `useTranslation`)
- ❌ Duplicate a component or hook that already exists
- ❌ Create a file over 300 lines without splitting
- ❌ Import from one feature folder into another (use `shared/` or `lib/`)
- ❌ Duplicate a component for a different role — parameterize with props instead
- ❌ Branch with `isDevBypassUser()` in data hooks — use the mock Supabase client instead
- ❌ Add `console.log` (use `console.warn` with `[FB-DEBUG]` prefix)
- ❌ Comment out code instead of deleting it
- ❌ Suppress ESLint rules without documenting why
- ❌ Break existing functionality during refactoring
- ❌ Define React components inside other component functions
- ❌ Import a component file that doesn't exist yet
