/**
 * useOnboardingStateMachine
 * ─────────────────────────
 * Hook that centralizes all onboarding state transitions.
 * Replaces the scattered `step === N` arithmetic in Onboarding.tsx.
 *
 * Usage:
 *   const { state, nextState, prevState, goTo, canProceed, canGoBack } =
 *     useOnboardingStateMachine(role, caregiverType);
 *
 * Works identically in dev-bypass and real-user modes (no isDevBypassUser() branches).
 */

import { useState, useCallback, useMemo } from "react";
import {
  type OnboardingState as State,
  type OnboardingRole,
  type CaregiverType,
  getNextState,
  getPreviousState,
  getTotalSteps,
  getStepIndex,
  stateToStep,
} from "@/lib/onboardingStateMachine";

export type { OnboardingState, OnboardingRole, CaregiverType } from "@/lib/onboardingStateMachine";

interface UseOnboardingStateMachineReturn {
  /** Current state in the state machine */
  state: State;
  /** Set the state directly (for transitions like role selection) */
  setState: (s: State) => void;
  /** Transition to the next state. Returns false if at terminal state. */
  nextState: () => boolean;
  /** Transition to the previous state. Returns false if at first state. */
  prevState: () => boolean;
  /** Jump to a specific state (e.g., after resuming from pendingOnboarding) */
  goTo: (s: State) => void;
  /** Whether the user can proceed (not at terminal state) */
  canProceed: boolean;
  /** Whether the user can go back (not at first state) */
  canGoBack: boolean;
  /** Current step index (0-based) for progress bar */
  stepIndex: number;
  /** Total steps for progress bar */
  totalSteps: number;
  /** Legacy step number for backward compatibility with step components */
  step: number;
  /** Whether the user has completed onboarding */
  isComplete: boolean;
  /** Whether onboarding failed */
  isFailed: boolean;
  /** Whether the user needs to go to the dashboard */
  shouldRedirect: boolean;
}

export function useOnboardingStateMachine(
  role: OnboardingRole | null,
  caregiverType: CaregiverType
): UseOnboardingStateMachineReturn {
  const [state, setState] = useState<State>("role_selection");

  const nextState = useCallback((): boolean => {
    const next = getNextState(state, role, caregiverType);
    if (next) {
      setState(next);
      return true;
    }
    return false;
  }, [state, role, caregiverType]);

  const prevState = useCallback((): boolean => {
    const prev = getPreviousState(state, role, caregiverType);
    if (prev) {
      setState(prev);
      return true;
    }
    return false;
  }, [state, role, caregiverType]);

  const goTo = useCallback((s: State) => {
    setState(s);
  }, []);

  const totalSteps = useMemo(
    () => getTotalSteps(role, caregiverType),
    [role, caregiverType]
  );

  const stepIndex = useMemo(
    () => getStepIndex(state, role, caregiverType),
    [state, role, caregiverType]
  );

  const step = useMemo(() => stateToStep(state), [state]);

  const isComplete = state === "onboarding_complete";
  const isFailed = state === "onboarding_failed";
  const shouldRedirect = state === "redirect_to_dashboard";
  const canProceed = !isComplete && !isFailed && !shouldRedirect && state !== "role_selection";
  const canGoBack = state !== "role_selection" && !isComplete && !isFailed;

  return {
    state,
    setState,
    nextState,
    prevState,
    goTo,
    canProceed,
    canGoBack,
    stepIndex,
    totalSteps,
    step,
    isComplete,
    isFailed,
    shouldRedirect,
  };
}
