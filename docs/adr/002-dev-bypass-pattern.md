# ADR-002: Dev-Bypass Pattern

## Status
Accepted

## Context
The admin needs to proxy any role (FreeBrainer, BrainLover, Pro) to test the full experience without creating separate auth accounts. When proxying, the admin's real Supabase session uses `dev-user-id` as a placeholder UUID, which causes `22P02 invalid input syntax for type uuid` errors on every Supabase query.

## Decision
Implement a **dev-bypass guard** pattern:

- `src/lib/devBypass.ts` exports `isDevBypassUser()` and `isTestingMode` — checks whether the current user ID is `dev-user-id` or the admin is in proxy mode.
- **Every Supabase query** must guard with `isDevBypassUser()` or `isTestingMode` before making the call. If in dev-bypass, return mock data from localStorage or simulate the operation locally.
- `seedDevCaregiverLinks(force)` seeds mock FreeBrainers, teams, and check-in state into localStorage so the admin sees populated UIs without a real database.
- The guard is checked at the **data-hook level** (`use*.ts`), not in components — components should be unaware of dev-bypass.

## Consequences
- **Positive:** Admin can test every role's full flow without 400 errors or console spam. No ghost data leaks to real users — mock data only exists in dev-bypass localStorage.
- **Negative:** Every new data hook must remember to add the guard. Forgetting it causes immediate 400 errors visible in console.
- **Mitigation:** `AGENTS.md` documents the pattern; code review should flag any new Supabase call without a guard.
