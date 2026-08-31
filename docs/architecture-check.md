# Architecture Guard — Lego-Block Enforcement

## What It Does

`scripts/check-architecture.js` is a zero-dependency Node script that enforces the Lego-block architecture model. It runs in CI on every push and PR.

## Checks

### 1. Cross-Feature Imports

Detects when one feature folder imports directly from another feature folder instead of going through the shared layer.

**Violation:**
```typescript
// src/features/brainlover/BrainLoverBase.tsx
import { useOverviewData } from "@/features/freebrainer/useOverviewData"; // ❌
```

**Fix:**
```typescript
// Move the shared logic to src/lib/ or src/components/shared/
import { useOverviewData } from "@/lib/useOverviewData"; // ✅
```

**Allowed shared layers (any feature can import from these):**
- `src/components/shared/`
- `src/components/ui/`
- `src/lib/`
- `src/hooks/`
- `src/contexts/`
- `src/types/`
- `src/locales/`

### 2. Circular Dependencies

Detects circular import chains between feature folders (e.g., `brainlover → freebrainer → brainlover`).

## How to Run

```bash
# Locally
node scripts/check-architecture.js

# In CI (automatic)
# Runs as part of .github/workflows/ci.yml
```

## Why Not dependency-cruiser?

This script provides the same core enforcement (cross-feature + circular detection) with zero new dependencies, zero config files, and zero maintenance burden. The SVG graph feature of dependency-cruiser was deemed low-value for a non-technical team.

## CI Integration

The check runs in `.github/workflows/ci.yml` as a dedicated step. If violations are found, the step fails and the PR cannot merge.
