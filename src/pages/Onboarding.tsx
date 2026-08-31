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
import { Activity, Brain, ArrowLeft, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

import { StepCondition } from "@/components/onboarding/StepCondition";
import { StepMobility } from "@/components/onboarding/StepMobility";
import { StepSymptoms } from "@/components/onboarding/StepSymptoms";
import { StepVideoIntro } from "@/components/onboarding/StepVideoIntro";
import { StepConfirmation } from "@/components/onboarding/StepConfirmation";
import { StepBrainLoverFlow } from "@/components/onboarding/StepBrainLoverFlow";
import { FreeBrainerSteps } from "@/components/onboarding/FreeBrainerSteps";
import { StepMagicLinkAuth } from "@/components/onboarding/StepMagicLinkAuth";
import { StepInstallApp } from "@/components/onboarding/StepInstallApp";
import type { ManagementMode } from "@/components/onboarding/bl/BLStepManagementMode";

import { useOnboardingSubmit, type OnboardingState } from "@/features/onboarding/useOnboardingSubmit";
import { usePhotoUpload } from "@/features/onboarding/usePhotoUpload";
import { useLocationSearch } from "@/features/onboarding/useLocationSearch";
import { useSpeak } from "@/features/onboarding/useSpeak";
import { fetchInviteContextByEmail } from "@/lib/brainloverInvites";

export default function Onboarding() {
  const { t } = useTranslation();
  const { session, refreshRole, user } = useAuth();
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

  // ── Invite context state (resolved from URL → user_metadata → localStorage → Supabase) ──
  const [patientId, setPatientId] = useState<string | null>(urlPatientId || null);
  const [inviteCaregiverId, setInviteCaregiverId] = useState<string | null>(urlCaregiverId || null);
  const [fbNameParam, setFbNameParam] = useState<string | null>(urlFbName || null);
  const [fbAvatarParam, setFbAvatarParam] = useState<string | null>(null);
  const [inviterNameParam, setInviterNameParam] = useState<string | null>(urlInviterName || null);

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
      if (meta?.fb_invite_patient_id) {
        resolvedPatientId = meta.fb_invite_patient_id;
        resolvedCaregiverId = resolvedCaregiverId || meta.fb_invite_caregiver_id;
        resolvedFbName = resolvedFbName || meta.fb_invite_patient_name;
        resolvedFbAvatar = meta.fb_invite_patient_avatar || null;
        resolvedInviterName = resolvedInviterName || meta.fb_invite_inviter_name;
        console.log("[FB-DEBUG] Onboarding: recovered invite context from user_metadata:", meta);
      }

      // 2. Check localStorage (email-specific key)
      if (!resolvedPatientId && session?.user?.email) {
        const stored = localStorage.getItem(`fb_invite_${session.user.email.toLowerCase()}`);
        if (stored) {
          try {
            const ctx = JSON.parse(stored);
            resolvedPatientId = ctx.patientId || null;
            resolvedCaregiverId = ctx.caregiverId || resolvedCaregiverId;
            resolvedFbName = ctx.patientName || resolvedFbName;
            resolvedFbAvatar = ctx.patientAvatar || resolvedFbAvatar;
            resolvedInviterName = ctx.inviterName || resolvedInviterName;
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

      if (resolvedPatientId) {
        setPatientId(resolvedPatientId);
        setInviteCaregiverId(resolvedCaregiverId);
        setFbNameParam(resolvedFbName);
        setFbAvatarParam(resolvedFbAvatar);
        setInviterNameParam(resolvedInviterName);
      }
    })();
  }, [session, patientId]);

  // ── Step + flow state ──
  // If URL specifies a flow, use it. Otherwise, if we recovered invite context
  // (patientId from user_metadata or localStorage), default to "brainlover".
  const resolvedFlow = urlFlow || (patientId ? "brainlover" : "freebrainer");
  const [step, setStep] = useState(initialStep);
  const [flowType, setFlowType] = useState<"freebrainer" | "brainlover">(resolvedFlow);
  const [patientInfo, setPatientInfo] = useState<{ name: string; avatar: string | null } | null>(null);

  // Update flowType when patientId resolves from async sources (Supabase table, etc.)
  useEffect(() => {
    if (patientId && flowType !== "brainlover" && !urlFlow) {
      setFlowType("brainlover");
    }
  }, [patientId, flowType, urlFlow]);

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
  const [shareConsent, setShareConsent] = useState(true);
  const [diagnosisStory, setDiagnosisStory] = useState("");
  const [location, setLocation] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── BrainLover state ──
  const [caregiverType, setCaregiverType] = useState<"personal" | "professional" | null>(null);
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
    conditions, mobility, symptoms, movementDays, brainLoverEmail,
    diagnosisStory, shareConsent, location, photo, displayName,
    selectedTeam, teamCode, inviteCaregiverId,
    caregiverType, facility, patientEmail, connectionMethod, patientId,
    managementMode, subAccountPatientId,
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
  useEffect(() => {
    const pendingData = localStorage.getItem("pendingOnboarding");
    console.log("[FB-DEBUG] Onboarding resume check:", {
      hasSession: !!session?.user,
      userId: session?.user?.id,
      hasPending: !!pendingData,
    });
    if (session?.user && pendingData) {
      try {
        const data = JSON.parse(pendingData);
        console.log("[FB-DEBUG] Resuming pending onboarding:", {
          flowType: data.flowType,
          hasSubAccountName: !!data.subAccountName,
          subAccountName: data.subAccountName,
          subAccountPatientId: data.subAccountPatientId,
          managementMode: data.managementMode,
        });
        // Do NOT remove pendingOnboarding yet — let the handler remove it on success.
        // This way if the handler fails, we can retry on next load.
        if (data.flowType === "freebrainer") {
          handleComplete(data).then((success) => {
            console.log("[FB-DEBUG] FreeBrainer resume result:", success);
            if (success) {
              localStorage.removeItem("pendingOnboarding");
              setStep(15);
            }
          });
        } else {
          handleCompleteBrainLover(data).then((success) => {
            console.log("[FB-DEBUG] BrainLover resume result:", success);
            if (success) {
              localStorage.removeItem("pendingOnboarding");
            }
          });
        }
      } catch (e) {
        console.error("Failed to parse pending onboarding data", e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ── Wellness continue: skip obsolete step 5, go to step 6 ──
  const handleWellnessContinue = () => {
    const selected = symptomText.split(",").map((s) => s.trim()).filter((s) => s.length > 0).slice(0, 6);
    setSymptoms(selected);
    setStep(6);
  };

  const onPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) =>
    handlePhotoUpload(e, setPhoto, (msg) =>
      toast({ title: t("onboarding.uploadFailed"), description: msg, variant: "destructive" })
    );

const totalSteps = flowType === "freebrainer" ? 15 : (patientId ? 7 : 9);

  // ── Render ──
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
            {/* Step 1: Role selection */}
            {step === 1 && <StepRoleSelectionInline t={t} setFlowType={setFlowType} setCaregiverType={setCaregiverType} setStep={setStep} />}

            {/* FREEBRAINER FLOW */}
            {flowType === "freebrainer" && step === 2 && (
              <StepCondition conditions={conditions} setConditions={setConditions} conditionSearch={conditionSearch} setConditionSearch={setConditionSearch} onNext={() => setStep(3)} onBack={() => setStep(1)} speak={speak} />
            )}
            {flowType === "freebrainer" && step === 3 && (
              <StepMobility mobility={mobility} setMobility={setMobility} onNext={() => setStep(4)} onBack={() => setStep(2)} speak={speak} />
            )}
            {flowType === "freebrainer" && step === 4 && (
              <StepSymptoms symptomText={symptomText} setSymptomText={setSymptomText} onContinue={handleWellnessContinue} onBack={() => setStep(3)} speak={speak} />
            )}
            {flowType === "freebrainer" && step >= 6 && step <= 11 && (
              <FreeBrainerSteps
                step={step} setStep={setStep} photo={photo} fileInputRef={fileInputRef}
                handlePhotoUpload={onPhotoUpload} displayName={displayName} setDisplayName={setDisplayName}
                location={location} searchLocation={searchLocation} isSearchingLocation={isSearchingLocation}
                locationResults={locationResults} setLocation={setLocation} setLocationResults={setLocationResults}
                brainLoverEmail={brainLoverEmail} setBrainLoverEmail={setBrainLoverEmail}
                movementDays={movementDays} setMovementDays={setMovementDays}
                teamCode={teamCode} setTeamCode={setTeamCode} teamSearchQuery={teamSearchQuery}
                setTeamSearchQuery={setTeamSearchQuery} selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam}
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
                onSubAccountCreated={(pid, name, formData) => { setSubAccountPatientId(pid); setSubAccountName(name); if (formData) setSubAccountFormData(formData); }}
                freeBrainerName={subAccountName || patientInfo?.name || fbNameParam || ""}
                freeBrainerAvatar={patientInfo?.avatar || fbAvatarParam || null}
                handleCompleteBrainLover={handleCompleteBrainLover}
                isProcessing={isProcessing} speak={speak}
                isInvited={!!patientId}
                inviterName={inviterNameParam || null}
                subAccountPatientId={subAccountPatientId}
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
  setCaregiverType: (c: "personal" | "professional" | null) => void;
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
