/**
 * Onboarding.tsx — Slim orchestrator (~150 lines)
 * ─────────────────────────────────────────────
 * Manages step state + renders the appropriate step component.
 * All Supabase write logic lives in useOnboardingSubmit.
 * Photo upload lives in usePhotoUpload.
 * Location search lives in useLocationSearch.
 * Text-to-speech lives in useSpeak.
 *
 * Two-Tier Data Protocol:
 *   Tier 1 (sensitive): wellness params → localStorage (via useOnboardingSubmit)
 *   Tier 2 (social): profiles, roles, check-ins → Supabase (via useOnboardingSubmit)
 *   Tier 3 (derived): none at this stage
 */

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Brain, ArrowLeft, Heart, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOtpRedirectUrl } from "@/lib/otpRedirect";
import { isDevBypassUser } from "@/lib/devBypass";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

import { StepAgeGate } from "@/components/onboarding/StepAgeGate";
import { StepCondition } from "@/components/onboarding/StepCondition";
import { StepMobility } from "@/components/onboarding/StepMobility";
import { StepSymptoms } from "@/components/onboarding/StepSymptoms";
import { StepVideoIntro } from "@/components/onboarding/StepVideoIntro";
import { StepConfirmation } from "@/components/onboarding/StepConfirmation";
import { StepBrainLoverFlow } from "@/components/onboarding/StepBrainLoverFlow";
import { FreeBrainerSteps } from "@/components/onboarding/FreeBrainerSteps";
import { StepMagicLinkAuth } from "@/components/onboarding/StepMagicLinkAuth";
import { StepInstallApp } from "@/components/onboarding/StepInstallApp";
import { BrainFactLoader } from "@/components/shared/BrainFactLoader";
import { StepConsent } from "@/components/onboarding/StepConsent";
import type { ManagementMode } from "@/components/onboarding/bl/BLStepManagementMode";

import { useOnboardingSubmit, type OnboardingState } from "@/features/onboarding/useOnboardingSubmit";
import { usePhotoUpload } from "@/features/onboarding/usePhotoUpload";
import { useLocationSearch } from "@/features/onboarding/useLocationSearch";
import { useSpeak } from "@/features/onboarding/useSpeak";
import { fetchInviteContextByEmail } from "@/lib/brainloverInvites";
import { computeInviteIntent, type InviteKind } from "@/lib/inviteRouting";

export default function Onboarding() {
  const { t } = useTranslation();
  const { session, refreshRole, user, userRole, onboardingCompleted } = useAuth();
  const { toast } = useToast();
  const speak = useSpeak();
  const { isProcessing: photoProcessing, handlePhotoUpload } = usePhotoUpload();
  const { locationResults, isSearchingLocation, searchLocation, setLocationResults } = useLocationSearch();

  // ── URL params (sync) ──
  const searchParams = new URLSearchParams(window.location.search);
  const urlFlow = (searchParams.get("flow") as "freebrainer" | "brainlover") || "";
  const initialStep = parseInt(searchParams.get("step") || "1", 10);
  const urlPatientId = searchParams.get("patient_id");
  const urlCaregiverId = searchParams.get("caregiver_id");
  const urlFbName = searchParams.get("fb_name");
  const urlInviterName = searchParams.get("inviter_name");
  const urlTeamId = searchParams.get("team_id");
  const inviteKind = searchParams.get("kind") as InviteKind | null;

  // ── Invite context state (resolved from URL → user_metadata → localStorage → Supabase) ──
  const [patientId, setPatientId] = useState<string | null>(urlPatientId || null);
  const [inviteCaregiverId, setInviteCaregiverId] = useState<string | null>(urlCaregiverId || null);
  const [fbNameParam, setFbNameParam] = useState<string | null>(urlFbName || null);
  const [fbAvatarParam, setFbAvatarParam] = useState<string | null>(null);
  const [inviterNameParam, setInviterNameParam] = useState<string | null>(urlInviterName || null);
  const [caregiverType, setCaregiverType] = useState<"personal" | "professional" | "parent" | null>(null);

  // ── Recover invite context from all sources ──
  // Supabase magic links strip query params from the redirect URL.
  // Check: URL params → session user_metadata → email-keyed localStorage → Supabase table
  useEffect(() => {
    (async () => {
      let resolvedPatientId: string | null = null;
      let resolvedCaregiverId = urlCaregiverId;
      let resolvedFbName = urlFbName;
      let resolvedFbAvatar: string | null = null;
      let resolvedInviterName = urlInviterName;

      // 1. Check session user_metadata (survives magic link redirect for NEW users)
      const meta = (session?.user as any)?.user_metadata;
      if (meta?.fb_invite_patient_id || meta?.fb_invite_kind === "parent_invite") {
        resolvedPatientId = meta.fb_invite_patient_id || resolvedPatientId;
        resolvedCaregiverId = resolvedCaregiverId || meta.fb_invite_caregiver_id;
        resolvedFbName = resolvedFbName || meta.fb_invite_patient_name;
        resolvedFbAvatar = meta.fb_invite_patient_avatar || null;
        resolvedInviterName = resolvedInviterName || meta.fb_invite_inviter_name;
        if (meta.fb_invite_kind === "parent_invite") {
          setCaregiverType("parent");
        }
        console.log("[FB-DEBUG] Onboarding: recovered invite context from user_metadata:", meta);
      }

      // 2. Check localStorage (email-specific key)
      // Also check for kind=parent_invite even when no patientId — parent invites
      // don't have a patient ID yet (child hasn't completed onboarding).
      if (session?.user?.email) {
        const stored = localStorage.getItem(`fb_invite_${session.user.email.toLowerCase()}`);
        if (stored) {
          try {
            const ctx = JSON.parse(stored);
            resolvedPatientId = ctx.patientId || resolvedPatientId;
            resolvedCaregiverId = ctx.caregiverId || resolvedCaregiverId;
            resolvedFbName = ctx.patientName || resolvedFbName;
            resolvedFbAvatar = ctx.patientAvatar || resolvedFbAvatar;
            resolvedInviterName = ctx.inviterName || resolvedInviterName;
            if (ctx.kind === "parent_invite") {
              setCaregiverType("parent");
            }
            console.log("[FB-DEBUG] Onboarding: recovered invite context from localStorage:", ctx);
          } catch (e) { /* ignore */ }
        }
      }

      // 3. ALWAYS check Supabase brainlover_invites table — most reliable source
      //    for inviter_name (user_metadata only works for NEW users, localStorage
      //    is on the inviter's browser, not the invitee's).
      //    CRITICAL: If user_metadata has a dev-patient ID (sent before the original
      //    BrainLover authenticated) but Supabase has a real UUID (from the re-sent
      //    invite after auth), the Supabase value MUST override user_metadata.
      if (session?.user?.email) {
        const ctx = await fetchInviteContextByEmail(session.user.email);
        if (ctx) {
          // If Supabase has a real UUID and user_metadata/localStorage has a dev-patient ID,
          // the Supabase value wins (it was re-sent after the original BL authenticated).
          const isDevPatient = (id: string | null) => !!id && id.startsWith("dev-patient-");
          if (ctx.patientId && !isDevPatient(ctx.patientId) && isDevPatient(resolvedPatientId)) {
            console.log("[FB-DEBUG] Onboarding: overriding dev-patient ID with real UUID from Supabase:", ctx.patientId);
            resolvedPatientId = ctx.patientId;
          } else {
            resolvedPatientId = resolvedPatientId || ctx.patientId;
          }
          resolvedCaregiverId = resolvedCaregiverId || ctx.caregiverId;
          resolvedFbName = resolvedFbName || ctx.patientName;
          // Always overwrite avatar + inviterName from Supabase — most reliable source
          resolvedFbAvatar = ctx.patientAvatar || resolvedFbAvatar;
          resolvedInviterName = ctx.inviterName || resolvedInviterName;
          console.log("[FB-DEBUG] Onboarding: recovered invite context from Supabase:", ctx);
        }
      }

      if (resolvedPatientId || resolvedFbName || resolvedInviterName) {
        // Last resort for the name/avatar: any earlier invite that named this
        // patient (the link may carry no fb_name, and the patient's profiles
        // row is RLS-invisible to not-yet-linked invitees).
        if (!resolvedFbName && resolvedPatientId) {
          try {
            const { fetchInviteByPatientId } = await import("@/lib/brainloverInvites");
            const named = await fetchInviteByPatientId(resolvedPatientId);
            if (named?.patientName) {
              resolvedFbName = named.patientName;
              resolvedFbAvatar = resolvedFbAvatar || named.patientAvatar;
              console.log("[FB-DEBUG] Onboarding: recovered patient name from earlier invite row:", named.patientName);
            }
          } catch (e) {
            console.warn("[FB-DEBUG] Onboarding patient-name fallback failed (non-fatal):", e);
          }
        }
        setPatientId(resolvedPatientId);
        setInviteCaregiverId(resolvedCaregiverId);
        if (resolvedFbName) setFbNameParam(resolvedFbName);
        if (resolvedFbAvatar) setFbAvatarParam(resolvedFbAvatar);
        if (resolvedInviterName) setInviterNameParam(resolvedInviterName);
      }
    })();
  }, [session, patientId]);

  // ── Step + flow state ──
  // The invite intent is the single source of truth for which onboarding the
  // user gets — derived once here (kind + recovered patient context) instead of
  // scattered fallbacks. It recomputes as patientId resolves from async sources.
  const inviteIntent = computeInviteIntent({
    teamId: urlTeamId,
    patientId,
    caregiverId: inviteCaregiverId,
    fbName: fbNameParam,
    inviterName: urlInviterName,
    kind: inviteKind,
    caregiverType: caregiverType,
  });
  // ── Invariant: an existing FreeBrainer is pinned ⇒ the invitee is a
  //    secondary BrainLover. They ALWAYS get the invited BrainLover onboarding
  //    (never FreeBrainer setup, never the role picker) — enforced here so it
  //    holds regardless of which caller sent the invite (teams, love, onboarding).
  const pinnedToExistingFb = inviteIntent.kind === "support_existing_fb";
  const resolvedFlow = pinnedToExistingFb ? "brainlover" : (urlFlow || inviteIntent.flow);
  const startStep = inviteIntent.invited ? Math.max(2, initialStep) : initialStep;
  const [step, setStep] = useState(startStep);
  const [flowType, setFlowType] = useState<"freebrainer" | "brainlover">(resolvedFlow);
  const [patientInfo, setPatientInfo] = useState<{ name: string; avatar: string | null } | null>(null);

  // Update flowType when patientId resolves from async sources (Supabase table, etc.).
  // A pinned existing FreeBrainer always forces the BrainLover flow — even when
  // a stale URL `flow=freebrainer` contradicts it — and skips past role selection.
  useEffect(() => {
    if (patientId && flowType !== "brainlover") {
      if (pinnedToExistingFb || !urlFlow) {
        setFlowType("brainlover");
        if (pinnedToExistingFb && step < 2) setStep(2);
      }
    }
  }, [patientId, flowType, urlFlow, pinnedToExistingFb, step]);

  // Update flowType for parent invites — parent lands on /onboarding with no
  // patient context (child hasn't completed onboarding yet). caregiverType is
  // recovered from localStorage/user_metadata in the invite context effect above.
  useEffect(() => {
    if (caregiverType === "parent" && flowType !== "brainlover") {
      setFlowType("brainlover");
      if (step < 2) setStep(2);
    }
  }, [caregiverType, flowType, step]);

  // ── FreeBrainer state ──
  const [conditions, setConditions] = useState<string[]>([]);
  const [conditionSearch, setConditionSearch] = useState("");
  const [mobility, setMobility] = useState<number[]>([5]);
  const [symptomText, setSymptomText] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [brainLoverEmail, setBrainLoverEmail] = useState("");
  const [movementDays, setMovementDays] = useState<number[]>([3]);
  const [teamCode, setTeamCode] = useState("");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [shareConsent, setShareConsent] = useState(true);
  const [diagnosisStory, setDiagnosisStory] = useState("");
  const [location, setLocation] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── BrainLover state ──
  const [facility, setFacility] = useState("");
  const [connectionMethod, setConnectionMethod] = useState<"invite" | "code" | null>(null);
  const [connectionCode, setConnectionCode] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [blShareConsent, setBlShareConsent] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [managementMode, setManagementMode] = useState<ManagementMode | null>(null);
  const [subAccountPatientId, setSubAccountPatientId] = useState<string | null>(null);
  const [subAccountName, setSubAccountName] = useState<string>("");
  const [subAccountFormData, setSubAccountFormData] = useState<{ conditions?: string; location?: string; diagnosisStory?: string; photo?: string | null }>({});
  const [foundPatientId, setFoundPatientId] = useState<string | null>(null);

  // ── OS detection for wearables ──
  useEffect(() => {
    setIsIOS(/iphone|ipad|ipod|mac/.test(window.navigator.userAgent.toLowerCase()));
  }, []);

  // ── Fetch patient info (BrainLover flow) ──
  // For managed sub-accounts, there's no profiles row — check managed_freebrainers too.
  useEffect(() => {
    (async () => {
      if (!patientId) return;
      try {
        // Try profiles first
        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("user_id", patientId)
          .maybeSingle();
        if (data) {
          setPatientInfo({ name: data.display_name || "FreeBrainer", avatar: data.avatar_url });
        } else if (error) {
          console.warn("Patient info fetch non-fatal error:", error);
        }
        // Fallback: check managed_freebrainers (sub-accounts don't have a profiles row)
        if (!data) {
          const { data: managed } = await (supabase as any)
            .from("managed_freebrainers")
            .select("display_name, avatar_url")
            .eq("id", patientId)
            .maybeSingle();
          if (managed) {
            setPatientInfo({ name: managed.display_name || "FreeBrainer", avatar: managed.avatar_url || null });
          }
        }
        // Final fallback: use fb_name from URL/localStorage if DB queries fail (RLS, etc.)
        if (!data && !patientInfo && fbNameParam) {
          setPatientInfo({ name: fbNameParam, avatar: null });
        }
      } catch (e) {
        console.error("Failed to fetch patient info:", e);
        // Last resort: use URL param
        if (fbNameParam) {
          setPatientInfo({ name: fbNameParam, avatar: null });
        }
      }
    })();
  }, [patientId]);

  // ── Assemble state object for submit hook ──
  const onboardingState: OnboardingState = {
    conditions, mobility, symptoms, movementDays, brainLoverEmail, email,
    diagnosisStory, shareConsent, location, photo, displayName,
    selectedTeam, teamCode, inviteCaregiverId,
    caregiverType, facility, patientEmail, connectionMethod, patientId,
    managementMode, subAccountPatientId, foundPatientId,
    currentStep: step,
    // ── Sub-account form data (for re-creating in Supabase after auth) ──
    subAccountName: subAccountName || null,
    subAccountConditions: subAccountFormData.conditions || null,
    subAccountLocation: subAccountFormData.location || null,
    subAccountDiagnosisStory: subAccountFormData.diagnosisStory || null,
    subAccountPhoto: subAccountFormData.photo || null,
  };

  const { isProcessing, handleComplete, handleCompleteBrainLover } = useOnboardingSubmit({
    state: onboardingState,
    session,
    refreshRole,
    toast,
    t,
  });

  // ── Resume pending onboarding after magic-link auth ──
  // Three past failure modes, all handled here:
  // 1. The first session emission after a link click can predate
  //    email_confirmed_at propagation → the handler re-saved pending and
  //    returned false, and NOTHING re-fired this effect (hang until the next
  //    session event, far away). Now: actively refresh the user record, then
  //    retry on a bounded timer.
  // 2. Corrupt pending JSON retried forever → now dropped on parse failure.
  // 3. Silent static step during ~15 sequential writes + an email send
  //    (looks hung; users reload mid-flight and corrupt state) → now a
  //    full-screen loader, plus a stuck escape hatch.
  const [resuming, setResuming] = useState(false);
  const [resumeStuck, setResumeStuck] = useState(false);
  const [resumeTick, setResumeTick] = useState(0);
  const resumeAttempts = useRef(0);
  const MAX_RESUME_ATTEMPTS = 24; // ~2 min at 5s intervals

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRetry = () => {
      if (cancelled) return;
      if (resumeAttempts.current++ < MAX_RESUME_ATTEMPTS) {
        timer = setTimeout(() => {
          if (!cancelled) setResumeTick((x) => x + 1);
        }, 5000);
      } else {
        console.warn("[FB-DEBUG] Resume gave up after ~2 min — showing retry UI.");
        setResumeStuck(true);
        setResuming(false);
      }
    };
    const pendingData = localStorage.getItem("pendingOnboarding");
    console.log("[FB-DEBUG] Onboarding resume check:", {
      hasSession: !!session?.user,
      userId: session?.user?.id,
      hasPending: !!pendingData,
    });
    if (!session?.user || !pendingData) return;
    (async () => {
      let data: {
      flowType: string;
      subAccountName?: unknown;
      subAccountPatientId?: unknown;
      managementMode?: unknown;
    };
      try {
        data = JSON.parse(pendingData);
      } catch (e) {
        // Corrupt blob: drop it so resume can never loop on garbage.
        console.error("Corrupt pendingOnboarding — dropping it.", e);
        localStorage.removeItem("pendingOnboarding");
        return;
      }
      setResuming(true);
      try {
        // Active refresh BEFORE gating: never trust the first emission.
        try {
          const { data: fresh } = await supabase.auth.getUser();
          if (cancelled) return;
          if (!fresh?.user?.email_confirmed_at && !isDevBypassUser(undefined)) {
            console.log("[FB-DEBUG] Resume waiting on email confirmation; retrying…");
            scheduleRetry();
            return;
          }
        } catch (e) {
          console.warn("[FB-DEBUG] Resume user refresh failed; retrying…", e);
          scheduleRetry();
          return;
        }
        console.log("[FB-DEBUG] Resuming pending onboarding:", {
          flowType: data.flowType,
          hasSubAccountName: !!data.subAccountName,
          subAccountName: data.subAccountName,
          subAccountPatientId: data.subAccountPatientId,
          managementMode: data.managementMode,
        });
        // Do NOT remove pendingOnboarding yet — let the handler remove it on success.
        // This way if the handler fails, we retry (bounded) instead of hanging.
        if (data.flowType === "freebrainer") {
          const success = await handleComplete(data);
          console.log("[FB-DEBUG] FreeBrainer resume result:", success);
          if (cancelled) return;
          if (success) {
            resumeAttempts.current = 0;
            localStorage.removeItem("pendingOnboarding");
            setResuming(false);
            setStep(15);
          } else {
            scheduleRetry();
          }
        } else {
          const success = await handleCompleteBrainLover(data);
          console.log("[FB-DEBUG] BrainLover resume result:", success);
          if (cancelled) return;
          if (success) {
            resumeAttempts.current = 0;
            localStorage.removeItem("pendingOnboarding");
            setResuming(false);
          } else {
            scheduleRetry();
          }
        }
      } catch (e) {
        console.error("Resume failed with exception; retrying…", e);
        scheduleRetry();
      }
    })();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, resumeTick]);

  // ── Stranded recovery: verified session, nothing to resume, nothing done ──
  // Cross-device hole: pendingOnboarding lives in the STARTING browser's
  // localStorage, so an email opened elsewhere verifies the account but
  // leaves no signup data to complete. Previously this silently restarted at
  // step 1 (data-loss confusion). Now: one honest banner explaining it, with
  // a continue path. Shown once per session; mid-flow and completed users
  // can never match (no session pre-auth; role/flag set post-completion).
  const [showStranded, setShowStranded] = useState(false);
  useEffect(() => {
    if (!session?.user || onboardingCompleted) return;
    if (isDevBypassUser(undefined)) return;
    if (userRole) return;
    if (localStorage.getItem("pendingOnboarding")) return;
    if (sessionStorage.getItem("fb_stranded_seen")) return;
    setShowStranded(true);
  }, [session, onboardingCompleted, userRole]);

  // ── Step 14 (FreeBrainer): auto-send OTP + stash pending ──
  // Email was captured at the age gate (step 2), so when the user reaches
  // step 14 with no session yet, send the confirmation OTP immediately (once
  // per email) and persist pendingOnboarding for the post-magic-link resume
  // effect above.
  useEffect(() => {
    if (flowType !== "freebrainer" || step !== 14) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || session?.user || isDevBypassUser(undefined)) return;
    const sentFlag = `fb_otp_sent_${cleanEmail}`;
    if (localStorage.getItem(sentFlag)) return;
    localStorage.setItem(sentFlag, "1");
    (async () => {
      try {
        const redirectPath = `/onboarding${window.location.search || "?install=1"}`;
        await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { emailRedirectTo: getOtpRedirectUrl(redirectPath), shouldCreateUser: true },
        });
      } catch (e) {
        console.warn("[FB-DEBUG] auto-send OTP failed (non-fatal):", (e as any)?.message);
      }
      await handleComplete(undefined, true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, flowType, email, session]);

  // ── Step 14: never ask a verified session to type their email ──
  // If the user reaches the magic-link step WITH a session (resumed child,
  // returning user), the address is already proven — adopt it so the
  // confirmation card renders instead of a redundant email form.
  useEffect(() => {
    if (flowType !== "freebrainer" || step !== 14) return;
    if (email.trim() || !session?.user?.email) return;
    setEmail(session.user.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, flowType, session]);

  // ── Child resume: a waiting child who clicked their finish-link ──
  // The child stopped at the age gate (step 2); the parent's completion
  // emailed them a finish-link. Landing here with a fresh session, recover
  // name/photo by child_email (invite row = single source of truth) and
  // resume at step 12 (first movement). Skipped when pendingOnboarding exists
  // (the resume effect above owns that case) and after onboarding completes.
  const hydratedChildRef = useRef(false);
  const initialStepRef = useRef(initialStep);
  useEffect(() => {
    if (hydratedChildRef.current) return;
    if (flowType !== "freebrainer" || step !== initialStepRef.current) return;
    if (!session?.user || onboardingCompleted) return;
    if (localStorage.getItem("pendingOnboarding")) return;
    const sessionEmail = session.user.email?.toLowerCase();
    if (!sessionEmail) return;
    const wantsResume = (session.user.user_metadata as any)?.fb_child_finish === "1";
    (async () => {
      try {
        const { fetchInviteByChildEmail } = await import("@/lib/brainloverInvites");
        const invite = await fetchInviteByChildEmail(sessionEmail);
        // Only resume if this email is a known waiting child whose link
        // hasn't been consumed (patient_id set = already finished).
        if (!invite || invite.patientId) return;
        if (!wantsResume && !invite.childName && !invite.childAvatar) return;
        hydratedChildRef.current = true;
        setEmail(sessionEmail);
        if (invite.childName) setDisplayName(invite.childName);
        if (invite.childAvatar) setPhoto(invite.childAvatar);
        setFlowType("freebrainer");
        setStep(12);
        console.log("[FB-DEBUG] child resume hydrated from invite row:", { sessionEmail, hasName: !!invite.childName });
      } catch (e) {
        console.warn("[FB-DEBUG] child resume hydration failed (non-fatal):", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, onboardingCompleted, flowType, step]);

  // ── Wellness continue: symptoms → profile (step 6) ──
  const handleWellnessContinue = () => {
    const selected = symptomText.split(",").map((s) => s.trim()).filter((s) => s.length > 0).slice(0, 6);
    setSymptoms(selected);
    setStep(6);
  };

  const onPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) =>
    handlePhotoUpload(e, setPhoto, (msg) =>
      toast({ title: t("onboarding.uploadFailed"), description: msg, variant: "destructive" })
    );

const totalSteps = flowType === "freebrainer" ? 15 : (inviteIntent.invited ? 7 : 9);

  // ── Render ──
  // While resume is working, show progress — never a static step (users
  // reload "hung" pages mid-write and corrupt state).
  if (resuming && !resumeStuck) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <BrainFactLoader isLoading />
      </div>
    );
  }
  if (resumeStuck) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <Card className="border-2 shadow-xl">
            <CardContent className="p-6 md:p-10 flex flex-col items-center text-center space-y-4">
              <h2 className="text-2xl font-bold">
                {t("onboarding.resumeStuckTitle", "Taking longer than usual…")}
              </h2>
              <p className="text-muted-foreground max-w-md">
                {t("onboarding.resumeStuckDesc", "Your signup is safe — finishing it is just taking a while. Tap below to try again.")}
              </p>
              <Button
                className="w-full h-14 text-lg font-bold"
                onClick={() => window.location.reload()}
              >
                {t("onboarding.resumeStuckRetry", "Try again")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Top bar: Back / Sign-out */}
        <div className="flex items-center justify-between mb-4">
          {step > 1 ? (
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="mr-2 h-5 w-5" /> {t("onboarding.back", "Back")}
            </Button>
          ) : <div />}
          {session?.user && session.user.id === "dev-user-id" && (
            <Button variant="outline" size="sm" className="text-xs text-destructive hover:bg-destructive/10"
              onClick={async () => {
                localStorage.removeItem("dev_bypass_auth");
                localStorage.removeItem("dev_role_override");
                localStorage.removeItem("pendingOnboarding");
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}>
              {t("onboarding.signOutReset", "Sign Out / Reset Session")}
            </Button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-8 flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${step > i ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <Card className="border-2 shadow-xl">
          <CardContent className="p-4 md:p-10">
            {showStranded && (
              <div className="mb-6 p-4 rounded-xl border-2 border-info/30 bg-info/5 text-left space-y-2">
                <p className="font-bold">
                  {t("onboarding.strandedTitle", "Email verified ✓ — one thing missing")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("onboarding.strandedDesc", "Your in-progress signup was on the device where you started, so there's nothing to finish here. Just continue below — your email is already confirmed.")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    sessionStorage.setItem("fb_stranded_seen", "1");
                    setShowStranded(false);
                  }}
                >
                  {t("onboarding.strandedContinue", "Continue setup")}
                </Button>
              </div>
            )}
            {/* Step 1: Role selection */}
            {step === 1 && <StepRoleSelectionInline t={t} setFlowType={setFlowType} setCaregiverType={setCaregiverType} setStep={setStep} />}

            {/* FREEBRAINER FLOW — age gate first (step 2): no PII is
                collected before we know whether this is an adult or a child.
                Under-18s stop at step 2 on the parent-waiting screen. */}
            {flowType === "freebrainer" && step === 2 && (
              <StepAgeGate
                purpose="child"
                onComplete={() => setStep(3)}
                onBack={() => setStep(1)}
                childName={displayName}
                childPhoto={photo}
                email={email || null}
                onEmailChange={setEmail}
                onNameChange={setDisplayName}
                fileInputRef={fileInputRef}
                onPhotoUpload={onPhotoUpload}
              />
            )}
            {flowType === "freebrainer" && step === 3 && (
              <StepCondition conditions={conditions} setConditions={setConditions} conditionSearch={conditionSearch} setConditionSearch={setConditionSearch} onNext={() => setStep(4)} onBack={() => setStep(2)} speak={speak} />
            )}
            {flowType === "freebrainer" && step === 4 && (
              <StepMobility mobility={mobility} setMobility={setMobility} onNext={() => setStep(5)} onBack={() => setStep(3)} speak={speak} />
            )}
            {flowType === "freebrainer" && step === 5 && (
              <StepSymptoms symptomText={symptomText} setSymptomText={setSymptomText} onContinue={handleWellnessContinue} onBack={() => setStep(4)} speak={speak} />
            )}
            {flowType === "freebrainer" && step >= 6 && step <= 11 && (
              <FreeBrainerSteps
                step={step} setStep={setStep} photo={photo} fileInputRef={fileInputRef}
                handlePhotoUpload={onPhotoUpload} displayName={displayName} setDisplayName={setDisplayName}
                location={location} searchLocation={searchLocation} isSearchingLocation={isSearchingLocation}
                locationResults={locationResults} setLocation={setLocation} setLocationResults={setLocationResults}
                brainLoverEmail={brainLoverEmail} setBrainLoverEmail={setBrainLoverEmail}
                movementDays={movementDays} setMovementDays={setMovementDays}
                teamCode={teamCode} setTeamCode={setTeamCode} teamSearchQuery={teamSearchQuery} setTeamSearchQuery={setTeamSearchQuery}
                selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam}
                isIOS={isIOS} shareConsent={shareConsent} setShareConsent={setShareConsent}
                diagnosisStory={diagnosisStory} setDiagnosisStory={setDiagnosisStory} speak={speak} toast={toast}
              />
            )}
            {flowType === "freebrainer" && step === 12 && <StepVideoIntro onNext={() => setStep(13)} speak={speak} />}
            {flowType === "freebrainer" && step === 13 && (
              <StepConfirmation step={step} onNext={() => setStep(14)} onComplete={() => setStep(14)} isProcessing={isProcessing} speak={speak} />
            )}
            {flowType === "freebrainer" && step === 14 && (
<StepMagicLinkAuth
                  email={email || null}
                  onResend={async () => {
                    const redirectPath = `/onboarding${window.location.search || "?install=1"}`;
                    const { error } = await supabase.auth.signInWithOtp({
                      email: email.trim(),
                      options: {
                        emailRedirectTo: getOtpRedirectUrl(redirectPath),
                        shouldCreateUser: true,
                      },
                    });
                    if (!error) {
                      localStorage.setItem(`fb_otp_sent_${email.trim().toLowerCase()}`, "1");
                      await handleComplete(undefined, true);
                    }
                  }}
                  onComplete={async () => {
                    const success = await handleComplete();
                    if (success) setStep(15);
                  }}
                 isProcessing={isProcessing || photoProcessing}
                 speak={speak}
               />
            )}
            {flowType === "freebrainer" && step === 15 && (
              <StepInstallApp
                userEmail={session?.user?.email || ""}
                onContinue={() => {
                  const installParam = new URLSearchParams(window.location.search).get("install") === "1" ? "?install=1" : "";
                  window.location.href = `/overview${installParam}`;
                }}
                speak={speak}
              />
            )}

                {/* BRAINLOVER FLOW (step ≥ 2 only — step 1 is role selection) */}
                {flowType === "brainlover" && step >= 2 && (
                  <StepBrainLoverFlow
                    step={step} setStep={setStep}
                    displayName={displayName} setDisplayName={setDisplayName}
                    photo={photo} fileInputRef={fileInputRef} onPhotoUpload={onPhotoUpload}
                    location={location} setLocation={setLocation}
                    searchLocation={searchLocation}
                    locationResults={locationResults} onSelectLocation={(loc) => { setLocation(loc); setLocationResults([]); }}
                    managementMode={managementMode} setManagementMode={setManagementMode}
                    caregiverId={session?.user?.id || "dev-user-id"}
                    patientEmail={patientEmail} setPatientEmail={setPatientEmail}
                    onFoundFreeBrainer={setFoundPatientId}
                    foundPatientId={foundPatientId}
                    onSubAccountCreated={(pid, name, formData) => { setSubAccountPatientId(pid); setSubAccountName(name); if (formData) setSubAccountFormData(formData); }}
                    freeBrainerName={subAccountName || patientInfo?.name || fbNameParam || ""}
                    freeBrainerAvatar={patientInfo?.avatar || fbAvatarParam || null}
                    handleCompleteBrainLover={handleCompleteBrainLover}
                    isProcessing={isProcessing} speak={speak}
                    isInvited={!!patientId || inviteKind === "parent_invite" || caregiverType === "parent"}
                    inviterName={inviterNameParam || null}
                    subAccountPatientId={subAccountPatientId}
                    caregiverType={caregiverType}
                  />
                )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Inline step 1 (role selection) ──
function StepRoleSelectionInline({ t, setFlowType, setCaregiverType, setStep }: {
  t: any;
  setFlowType: (f: "freebrainer" | "brainlover") => void;
  setCaregiverType: (c: "personal" | "professional" | "parent" | null) => void;
  setStep: (s: number) => void;
}) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
      <h1 className="text-xl md:text-2xl font-bold text-center mb-6 leading-tight">{t("onboarding.step1.title")}</h1>
      <div className="space-y-4">
        <Button variant="outline" className="w-full h-auto p-4 md:p-5 justify-start border-2 hover:border-primary hover:bg-primary/5 whitespace-normal text-left"
          onClick={() => { setFlowType("freebrainer"); setStep(2); }}>
          <Activity className="h-8 w-8 md:h-10 md:w-10 mr-4 text-primary shrink-0" />
          <div>
            <div className="font-bold text-lg md:text-xl">{t("onboarding.step1.freebrainer")}</div>
            <div className="text-sm md:text-base text-muted-foreground font-normal mt-1">{t("onboarding.step1.freebrainerDesc")}</div>
          </div>
        </Button>
        <Button variant="outline" className="w-full h-auto p-4 md:p-5 justify-start border-2 hover:border-primary hover:bg-primary/5 whitespace-normal text-left"
          onClick={() => { setFlowType("brainlover"); setStep(2); }}>
          <Heart className="h-8 w-8 md:h-10 md:w-10 mr-4 text-primary shrink-0" />
          <div>
            <div className="font-bold text-lg md:text-xl">{t("onboarding.step1.brainlover")}</div>
            <div className="text-sm md:text-base text-muted-foreground font-normal mt-1">{t("onboarding.step1.brainloverDesc")}</div>
          </div>
        </Button>
        <Button variant="outline" className="w-full h-auto p-4 md:p-5 justify-start border-2 hover:border-primary hover:bg-primary/5 whitespace-normal text-left"
          onClick={() => { setFlowType("brainlover"); setCaregiverType("professional"); setStep(2); }}>
          <Brain className="h-8 w-8 md:h-10 md:w-10 mr-4 text-primary shrink-0" />
          <div>
            <div className="font-bold text-lg md:text-xl">{t("onboarding.step1.brainfreeer")}</div>
            <div className="text-sm md:text-base text-muted-foreground font-normal mt-1">{t("onboarding.step1.brainfreeerDesc")}</div>
          </div>
        </Button>
        <Button variant="outline" className="w-full h-auto p-4 md:p-5 justify-start border-2 hover:border-primary hover:bg-primary/5 whitespace-normal text-left"
          onClick={() => { setFlowType("brainlover"); setCaregiverType("parent"); setStep(2); }}>
          <Users className="h-8 w-8 md:h-10 md:w-10 mr-4 text-primary shrink-0" />
          <div>
            <div className="font-bold text-lg md:text-xl">{t("onboarding.step1.parent")}</div>
            <div className="text-sm md:text-base text-muted-foreground font-normal mt-1">{t("onboarding.step1.parentDesc")}</div>
          </div>
        </Button>
      </div>
      <div className="text-center pt-3">
        <button
          type="button"
          onClick={() => { window.location.href = "/auth"; }}
          className="text-base text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 py-2 px-4 min-h-[44px] inline-flex items-center"
        >
          {t("onboarding.alreadyHaveAccount", "I already have an account")}
        </button>
      </div>
      {/* Medical disclaimer */}
      <div className="p-4 bg-muted/30 rounded-xl border text-xs text-muted-foreground leading-relaxed mt-6">
        <span className="font-semibold text-foreground">{t("onboarding.magicAuth.disclaimerTitle", "Medical & Privacy Disclaimer:")}</span> {t("onboarding.magicAuth.disclaimerText", "FreeBrain is a fitness and movement habit tracker for general wellness and community support. It is not a medical device, diagnostic tool, or clinical record keeper.")}
      </div>
    </div>
  );
}
