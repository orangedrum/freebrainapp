# ADR 006: BrainLover Team Integration

## Status

Accepted

## Context

BrainLovers (caregivers) and FreeBrainers exist in two separate data models:
- `team_members` — FreeBrainers grouped into a team (for leaderboard, roster, rally)
- `caregiver_links` — BrainLovers linked to individual FreeBrainers (for dashboard, encourage, boost)

The product requirement is that BrainLovers should be considered part of their FreeBrainer's team. When a FreeBrainer is on a team, their BrainLovers are on that team too. However, BrainLovers are observers — they don't contribute to the team's score or rank.

### Roster Visibility Rules

| Viewer | What they see |
|--------|--------------|
| FreeBrainer viewing own roster | Their own BrainLovers shown as expandable sub-section within their list item (name + avatar + "BrainLover" badge), open by default |
| FreeBrainer viewing other FreeBrainers | Other FreeBrainers' BrainLovers shown as a count only (e.g., "2 BrainLovers") — no names |
| BrainLover viewing roster | Their associated FreeBrainer's other BrainLovers shown normally. Other FreeBrainers' BrainLovers shown as count only |
| Team leaderboard | BrainLovers are observers — no score contribution |

### Virtual Session "Invite All"

- FreeBrainers can invite all BrainLovers OR all team members
- BrainLovers can invite their FreeBrainer and other BrainLovers associated with their FreeBrainer
- Both options send in-app notifications so recipients can join from the app

## Decision

**Approach 1 (current): Virtual merge at query time.**

BrainLovers are NOT inserted into `team_members`. Instead, the roster query fetches `caregiver_links` for each team member and merges them into the display at the hook level. This avoids any schema migration and is fully reversible.

**Future: Approach 2 — Auto-insert into `team_members` with a `role` column.**

When the schema migration window is available, add a `role` column to `team_members` ('freebrainer' | 'brainlover'). A DB trigger or app-level handler inserts a `team_members` row whenever a `caregiver_link` is created. This makes BrainLovers first-class team members and simplifies roster queries to a single table.

## Consequences

### Current (Approach 1)
- ✅ No migration risk — zero DB changes
- ✅ Fully reversible
- ✅ Fast to ship
- ⚠️ Roster queries need a second fetch for `caregiver_links`
- ⚠️ BrainLovers aren't "real" team members — can't query `team_members` alone

### Future (Approach 2)
- ✅ Single source of truth — roster queries just work
- ✅ BrainLovers are first-class team members
- ⚠️ Requires migration (add `role` column, trigger logic)
- ⚠️ Risk of orphan rows if links are deleted without cleanup
