# ADR-004: Check-In Flow State Machine

## Status
Accepted

## Context
The daily check-in is FreeBrain's core engagement loop. It must happen once per day, feel rewarding, and never interrupt users who have already checked in. Early implementations had bugs where the modal re-opened after check-in, the mystery box animation was cut short, and PWA updates interrupted video playback.

## Decision
The check-in is a **multi-step modal state machine** with these states:

1. **Movement Choice** — "What do you feel up to today?" (Move / Rest / Test)
2. **Video + Time** — pick a video, set duration on a time slider, cast to TV option
3. **Symptoms** — track symptom levels (Bad → Great sliders)
4. **Review** — confirm check-in details
5. **Mystery Box** — animated reward reveal (spinning box → points/streak)

**Rules:**
- The modal **auto-opens once daily** when `hasCheckedInToday` is `false`. A `completedCheckInThisSession` flag prevents re-opening during the same session's refetch cycle.
- After check-in, the dashboard shows a **`KeepMovingCard`** instead of the modal, letting users move again optionally.
- **PWA updates are deferred** during video playback (step 2) via `checkInProgressGlobal(true)`. The `usePWAUpdate` hook checks this flag before triggering a reload.
- The mystery box animation must complete before the modal auto-closes — the close effect checks for a `mysteryDone` flag, not `checkinStatus === "moved"`.
- Date comparison uses local timezone (`date-fns format()`) on both read and write paths to prevent timezone mismatch bugs.

## Consequences
- **Positive:** Predictable, once-daily flow. No infinite loops. Animation completes. PWA updates don't interrupt the core loop.
- **Negative:** State machine has many flags (`hasCheckedInToday`, `completedCheckInThisSession`, `checkInProgressGlobal`, `mysteryDone`) that must stay in sync. Adding a new step requires updating the flow carefully.
- **Mitigation:** All state lives in `useCheckInData.ts` and `CheckInFlow.tsx` — no other file mutates check-in state. `AGENTS.md` documents the state machine.
