/**
 * inviteRouting — the invite → onboarding state machine (single source of truth).
 *
 * Every invite is reduced to ONE of four intents. The intent is produced ONCE
 * (in JoinTeam after resolving all context sources + URL params) and then
 * consumed by Onboarding — never re-derived from stacked fallbacks. This kills
 * the class of bugs where a link's semantics drifted across callers (e.g. the
 * overloaded `role=caregiver` param meaning different things in different
 * senders) and where a new user was dropped onto a dashboard without onboarding.
 *
 * Senders append an explicit `kind` param so JoinTeam does not have to guess.
 * Legacy links without `kind` are still resolved via the fallback rules below.
 */

export type InviteKind =
  | "support_existing_fb"
  | "join_as_freebrainer"
  | "join_as_brainlover"
  | "team_only";

export interface InviteRouteInput {
  teamId: string | null;
  patientId: string | null;
  caregiverId: string | null;
  fbName: string | null;
  inviterName: string | null;
  /** Explicit kind carried by the invite link (may be null for legacy links). */
  kind: InviteKind | null;
}

export interface InviteIntent {
  kind: InviteKind;
  teamId: string | null;
  patientId: string | null;
  caregiverId: string | null;
  fbName: string | null;
  inviterName: string | null;
  /** Onboarding flow the invitee must complete. */
  flow: "freebrainer" | "brainlover";
  /** True when the invitee is a care-giver joining an EXISTING FreeBrainer
   *  (uses the short invited BrainLover onboarding, 7 steps). */
  invited: boolean;
  /** Total steps for the chosen flow (15 FB / 7 invited BL / 9 default BL). */
  totalSteps: number;
  /** First onboarding step to land on. */
  step: number;
}

const FLOWS = {
  support_existing_fb: { flow: "brainlover", invited: true, totalSteps: 7 },
  join_as_freebrainer: { flow: "freebrainer", invited: false, totalSteps: 15 },
  join_as_brainlover: { flow: "brainlover", invited: false, totalSteps: 9 },
  team_only: { flow: "freebrainer", invited: false, totalSteps: 15 },
} as const;

/**
 * Reduce a resolved invite route (URL params + recovered context) to a single
 * intent. `kind` wins when present; legacy links are classified by heuristics:
 *  - patient context  → supporting an EXISTING FreeBrainer
 *  - caregiver only   → joining as a FreeBrainer (legacy InviteFreeBrainerModal)
 *  - everything else  → team-only join
 *
 * INVARIANT: whenever an existing FreeBrainer is pinned (patientId present),
 * the invitee is by definition a SECONDARY BrainLover and always enters the
 * invited BrainLover onboarding (7 steps, step 2 shows the FreeBrainer's
 * picture) — never the primary flow that creates/connects a FreeBrainer they
 * already have. Onboarding.tsx enforces the same rule at rendering time.
 */
export function computeInviteIntent(input: InviteRouteInput): InviteIntent {
  let kind = input.kind;

  if (!kind) {
    if (input.patientId) kind = "support_existing_fb";
    else if (input.caregiverId) kind = "join_as_freebrainer";
    else kind = "team_only";
  } else if (input.patientId && (kind === "team_only" || kind === "join_as_brainlover")) {
    kind = "support_existing_fb";
  }

  const meta = FLOWS[kind] ?? FLOWS.team_only;

  return {
    kind,
    teamId: input.teamId,
    patientId: input.patientId,
    caregiverId: input.caregiverId,
    fbName: input.fbName,
    inviterName: input.inviterName,
    flow: meta.flow,
    invited: meta.invited,
    totalSteps: meta.totalSteps,
    step: 2,
  };
}

/**
 * Serialize an intent into URL search params so Onboarding can consume it
 * after a reload/magic-link round-trip without re-splitting the source chain.
 */
export function intentToParams(intent: InviteIntent, extra?: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams();
  params.set("flow", intent.flow);
  params.set("step", String(intent.step));
  params.set("kind", intent.kind);
  if (intent.teamId) params.set("team_id", intent.teamId);
  if (intent.patientId) params.set("patient_id", intent.patientId);
  if (intent.caregiverId) params.set("caregiver_id", intent.caregiverId);
  if (intent.fbName) params.set("fb_name", intent.fbName);
  if (intent.inviterName) params.set("inviter_name", intent.inviterName);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  return params.toString();
}