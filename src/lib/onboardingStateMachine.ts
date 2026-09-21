/**
 * onboardingStateMachine
 * ──────────────────────
 * Defines all onboarding states, transitions, and step mappings.
 * Centralizes the logic that was previously scattered across Onboarding.tsx
 * as `step === N` arithmetic with `flowType` and `caregiverType` checks.
 *
 * Each role has its own state machine with explicit transitions.
 * The orchestrator (Onboarding.tsx) reads the current state and renders
 * the appropriate step component — no branching on role/type.
 *
 * PARENT INVITED FLOW:
 *   Reuses the existing invited brainlover components (BLStepInvitedWelcome,
 *   BLStepHowYoullHelp, BLStepProfile, etc.) with two additions:
 *   - Age gate (18+ check) after sample video
 *   - Consent checkbox ("I consent to my child using FreeBrain")
 *
 * The magic link IS the email validation — no separate email input needed.
 */

// ── Role types ──
export type OnboardingRole = "freebrainer" | "brainlover";
export type CaregiverType = "personal" | "professional" | "parent" | null;

// ── Onboarding states ──
export type OnboardingState =
  | "role_selection"           // Step 1: "I am a..." — user picks role
  | "session_verified"        // User clicked magic link, session exists
  | "condition"               // FreeBrainer step 2: conditions
  | "mobility"                // FreeBrainer step 3: mobility
  | "symptoms"                // FreeBrainer step 4: symptoms
  | "profile"                 // FreeBrainer steps 6-11: profile details
  | "video_intro"             // FreeBrainer step 12: video intro
  | "confirmation"            // FreeBrainer step 13: confirmation
  | "magic_link"              // FreeBrainer step 14: magic link auth
  | "install_app"             // FreeBrainer step 15: install app
  | "brainlover_details"      // BrainLover step 2: name, photo, location
  | "management_mode"         // BrainLover step 3: manage vs independent
  | "connect_freebrainer"     // BrainLover step 4: connect FreeBrainer
  | "support_options"         // BrainLover step 5: want support?
  | "brainlover_confirmation" // BrainLover step 6: confirmation
  | "brainlover_magic_link"   // BrainLover step 7: magic link auth
  | "brainlover_install"      // BrainLover step 8: install app
  | "invited_context"         // Invited flow: show FreeBrainer's name/photo
  | "how_youll_help"          // Invited flow: 3-column explanation
  | "get_sample"              // Invited flow: "Get a Sample"
  | "move_together"           // Invited flow: sample video
  | "age_gate"                // Parent flow: 18+ check (after sample video)
  | "consent"                 // Parent flow: "I consent to my child using FreeBrain"
  | "onboarding_complete"     // Terminal: user finished onboarding
  | "onboarding_failed"       // Terminal: handleComplete returned false
  | "redirect_to_dashboard";  // Terminal: navigate to role dashboard

// ── State transitions per role ──
const FREEBRAINER_TRANSITIONS: OnboardingState[] = [
  "role_selection",
  "condition",
  "mobility",
  "symptoms",
  "profile",
  "age_gate",        // After profile (name/photo captured)
  "video_intro",
  "confirmation",
  "magic_link",
  "install_app",
  "onboarding_complete",
];

const BRAINLOVER_PERSONAL_TRANSITIONS: OnboardingState[] = [
  "role_selection",
  "brainlover_details",  // Step 2: name, photo, location
  "age_gate",            // After profile (name/photo captured)
  "management_mode",
  "connect_freebrainer",
  "support_options",
  "brainlover_confirmation",
  "brainlover_magic_link",
  "brainlover_install",
  "onboarding_complete",
];

const BRAINLOVER_PROFESSIONAL_TRANSITIONS: OnboardingState[] = [
  "role_selection",
  "brainlover_details",  // Step 2: name, photo, location
  "age_gate",            // After profile (name/photo captured)
  "management_mode",
  "connect_freebrainer",
  "support_options",
  "brainlover_confirmation",
  "brainlover_magic_link",
  "brainlover_install",
  "onboarding_complete",
];

const PARENT_TRANSITIONS: OnboardingState[] = [
  "role_selection",
  "invited_context",         // Reuse BLStepInvitedWelcome — show child's name/photo
  "how_youll_help",          // Reuse BLStepHowYoullHelp — 3-column explanation
  "profile",                 // Reuse BLStepProfile — parent's name + photo + location
  "age_gate",                // After profile (name/photo captured)
  "get_sample",              // Reuse BLStepGetSample — "Get a Sample"
  "move_together",           // Reuse BLStepMoveTogether — sample video
  "consent",                 // "I consent to my child using FreeBrain"
  "magic_link",              // Reuse StepMagicLinkAuth — email verification
  "onboarding_complete",
];

// ── State machine helpers ──

/**
 * Returns the ordered list of states for a given role + caregiverType.
 */
export function getStatesForRole(
  role: OnboardingRole | null,
  caregiverType: CaregiverType
): OnboardingState[] {
  if (role === "freebrainer") return FREEBRAINER_TRANSITIONS;
  if (role === "brainlover") {
    // Parent invited flow uses the invited brainlover components + age gate + consent
    if (caregiverType === "parent") return PARENT_TRANSITIONS;
    if (caregiverType === "professional") return BRAINLOVER_PROFESSIONAL_TRANSITIONS;
    return BRAINLOVER_PERSONAL_TRANSITIONS;
  }
  return ["role_selection"];
}

/**
 * Given the current state, role, and caregiverType, returns the next state.
 * Returns null if there is no next state (terminal state).
 */
export function getNextState(
  currentState: OnboardingState,
  role: OnboardingRole | null,
  caregiverType: CaregiverType
): OnboardingState | null {
  const states = getStatesForRole(role, caregiverType);
  const idx = states.indexOf(currentState);
  if (idx === -1 || idx === states.length - 1) return null;
  return states[idx + 1];
}

/**
 * Given the current state, role, and caregiverType, returns the previous state.
 * Returns null if there is no previous state (first state).
 */
export function getPreviousState(
  currentState: OnboardingState,
  role: OnboardingRole | null,
  caregiverType: CaregiverType
): OnboardingState | null {
  const states = getStatesForRole(role, caregiverType);
  const idx = states.indexOf(currentState);
  if (idx <= 0) return null;
  return states[idx - 1];
}

/**
 * Returns the total number of steps for progress bar display.
 */
export function getTotalSteps(
  role: OnboardingRole | null,
  caregiverType: CaregiverType
): number {
  return getStatesForRole(role, caregiverType).length;
}

/**
 * Returns the current step index (0-based) for progress bar display.
 */
export function getStepIndex(
  currentState: OnboardingState,
  role: OnboardingRole | null,
  caregiverType: CaregiverType
): number {
  const states = getStatesForRole(role, caregiverType);
  return states.indexOf(currentState);
}

/**
 * Maps a state to the step number used by legacy components.
 * This allows gradual migration — components can still receive `step` prop
 * while the orchestrator uses the state machine.
 */
export function stateToStep(state: OnboardingState): number {
  const map: Record<OnboardingState, number> = {
    role_selection: 1,
    session_verified: 2,
    condition: 2,
    mobility: 3,
    symptoms: 4,
    profile: 6,
    video_intro: 7,
    confirmation: 8,
    magic_link: 9,
    install_app: 10,
    brainlover_details: 2,
    management_mode: 4,
    connect_freebrainer: 5,
    support_options: 6,
    brainlover_confirmation: 7,
    brainlover_magic_link: 8,
    brainlover_install: 9,
    invited_context: 2,
    how_youll_help: 3,
    get_sample: 6,
    move_together: 7,
    age_gate: 3,      // After profile for all flows
    consent: 8,
    onboarding_complete: 99,
    onboarding_failed: 0,
    redirect_to_dashboard: 100,
  };
  return map[state] ?? 1;
}

/**
 * Maps a step number back to a state for a given role.
 * Used for backward compatibility during migration.
 */
export function stepToState(
  step: number,
  role: OnboardingRole | null,
  caregiverType: CaregiverType
): OnboardingState {
  const states = getStatesForRole(role, caregiverType);
  // Step 1 is always role_selection
  if (step === 1) return "role_selection";
  // For step >= 2, find the corresponding state
  const idx = Math.min(step - 1, states.length - 1);
  return states[idx] ?? "role_selection";
}
