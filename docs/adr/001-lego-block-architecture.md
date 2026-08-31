# ADR-001: Lego-Block Architecture

## Status
Accepted

## Context
FreeBrain serves three user roles (FreeBrainer, BrainLover, Pro) with overlapping but distinct UIs. Early development mixed page-level layout, business logic, and UI components into single files, making it hard to share sections across roles and causing regressions when one role's changes affected another.

## Decision
Adopt a **Lego-block section architecture**:

- **Pages** (`src/pages/`) are slim composition layers — they import sections, arrange them, and pass data. No business logic lives in pages.
- **Sections** live in `src/features/<role>/` (e.g., `src/features/freebrainer/StreakRatioCard.tsx`). Each section is self-contained with its own data hooks where possible.
- **Shared components** that are role-agnostic live in `src/components/shared/` (e.g., `RecommendVideoModal`, `VirtualSessionCalendar`).
- **Data hooks** (`use*.ts`) are co-located with their feature folder, not in a global hooks directory.
- **Libraries** (`src/lib/`) contain pure functions with no React dependencies.

A page should read like a table of contents — each section is a named import rendered in order.

## Consequences
- **Positive:** Adding a new role means composing existing sections in a new page, not rewriting logic. Refactoring a section doesn't ripple into other roles. Files stay under 300 lines naturally.
- **Negative:** More files to navigate. Developers must check `src/features/` and `src/components/shared/` before creating anything new to avoid duplication.
- **Mitigation:** `AGENTS.md` and ESLint `max-lines` rule enforce this structure.
