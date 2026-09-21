import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { Mail, ArrowRight, Hourglass, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isDevBypassUser } from "@/lib/devBypass";
import { getOtpRedirectUrl } from "@/lib/otpRedirect";
import { fetchInviteContextByEmail } from "@/lib/brainloverInvites";
import { resendCooldownRemaining, markResent, cooldownMinutesLeft } from "@/lib/resendCooldown";
import { useAuth } from "@/contexts/AuthContext";

interface StepAgeGateProps {
  onComplete: () => void;
  onBack?: () => void;
  /** Child's display name — passed to the parent's invite link so they see it */
  childName?: string | null;
  /** Child's avatar URL — passed to the parent's invite link so they see it */
  childPhoto?: string | null;
  /** Child's email (child purpose only) */
  email?: string | null;
  /** Propagate child's email edits back up (child purpose only) */
  onEmailChange?: (email: string) => void;
  /** Propagate child's name edits back up so the parent invite + profile
   *  share one name (the age gate runs before the profile step now) */
  onNameChange?: (name: string) => void;
  /** Shared photo state (same value the profile step edits) + upload wiring.
   *  Optional: the invite falls back to a generated avatar without it. */
  fileInputRef?: React.RefObject<HTMLInputElement>;
  onPhotoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * "child" — FreeBrainer age gate: captures the child's email + birth year.
   * Under-18s invite a parent and then STOP on a waiting screen (they resume
   * at step 13 via the finish-link the parent's completion sends them).
   * "caregiver" — BrainLover age self-check: birth year only, must be 18+.
   * No invite is ever sent from this mode.
   */
  purpose: "child" | "caregiver";
}

export const StepAgeGate: React.FC<StepAgeGateProps> = ({
  onComplete,
  onBack,
  childName,
  childPhoto,
  email,
  onEmailChange,
  onNameChange,
  fileInputRef,
  onPhotoUpload,
  purpose,
}) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const isCaregiver = purpose === "caregiver";
  const [childEmail, setChildEmail] = useState(email || "");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [showParentConsent, setShowParentConsent] = useState(false);
  const [parentEmail, setParentEmail] = useState("");
  const [parentSent, setParentSent] = useState(false);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState("");
  const [resendCount, setResendCount] = useState(0);
  const [cooldownMs, setCooldownMs] = useState(0);
  const isDevBypass = isDevBypassUser(undefined);

  const calculateAgeFromYear = (birthYear: string): number | null => {
    const year = parseInt(birthYear, 10);
    if (isNaN(year)) return null;
    return new Date().getFullYear() - year;
  };

  const handleYearChange = (year: string) => {
    setDob(year);
    setAge(calculateAgeFromYear(year));
  };

  const handleChildEmailChange = (value: string) => {
    setChildEmail(value);
    onEmailChange?.(value);
  };

  const handleContinue = () => {
    if (!dob) return;
    if (!isCaregiver && (!childEmail.trim() || !(childName || "").trim())) return;
    if (age !== null && age >= 18) {
      onComplete();
    } else if (!isCaregiver) {
      setShowParentConsent(true);
    }
    // Caregiver + under 18: stay — the dead-end card below explains why.
  };

  /**
   * Send (or re-send) the parent invite. Persists the child's snapshot on the
   * invite row so the parent's completion can email the child a finish-link
   * and the child can resume at step 13 (name/photo recovered by child_email).
   */
  const sendParentInvite = async (parentEmailRaw: string): Promise<boolean> => {
    const cleanParentEmail = parentEmailRaw.trim().toLowerCase();
    if (!cleanParentEmail) return false;
    const cleanChildEmail = childEmail.trim().toLowerCase();
    setParentLoading(true);
    setParentError("");
    try {
      // Store invite context in localStorage so the parent's onboarding
      // can recover the child's name/photo after the magic-link round-trip.
      localStorage.setItem(`fb_invite_${cleanParentEmail}`, JSON.stringify({
        patientName: childName || null,
        patientAvatar: childPhoto || null,
        patientId: session?.user?.id ?? null,
        role: "brainlover",
        kind: "parent_invite",
        inviterName: childName || null,
      }));

      // Persist the invite in brainlover_invites. patient_id stays null until
      // the child finishes onboarding AFTER the parent, at which point the
      // child's handleComplete resolves it (and creates caregiver_links).
      // Requires migration 50 (child_* columns) — the read-back below fails
      // LOUD if the columns are missing, instead of stranding the child with
      // no finish-link and no way to retry.
      const { error: upsertErr } = await (supabase.from("brainlover_invites") as any).upsert({
        invitee_email: cleanParentEmail,
        patient_id: null,
        caregiver_id: "",
        patient_name: childName || null,
        patient_avatar: childPhoto || null,
        inviter_name: childName || null,
        role: "brainlover",
        child_email: cleanChildEmail || null,
        child_name: childName || null,
        child_avatar: childPhoto || null,
        child_birth_year: dob || null,
      }, { onConflict: "invitee_email" }).select("id").single();
      if (upsertErr) {
        console.warn("[FB-DEBUG] brainlover_invites upsert error:", upsertErr.message);
        setParentError(
          t("ageGate.inviteSaveFailed", "We couldn't save your parent's invite. Please check your connection and try again — do not continue until this succeeds, or your parent won't be linked.")
        );
        return false;
      }

      // Read-back: prove the row (including child_email) actually persisted
      // before sending any OTP. Without this, a schema/RLS problem produces
      // an orphan invite: parent onboarded, child never emailable, zero UI.
      try {
        const saved = await fetchInviteContextByEmail(cleanParentEmail);
        if (!saved || (cleanChildEmail && saved.childEmail !== cleanChildEmail)) {
          console.warn("[FB-DEBUG] brainlover_invites read-back mismatch:", {
            found: !!saved,
            childEmail: saved?.childEmail || null,
            expected: cleanChildEmail || null,
          });
          setParentError(
            t("ageGate.inviteSaveFailed", "We couldn't save your parent's invite. Please check your connection and try again — do not continue until this succeeds, or your parent won't be linked.")
          );
          return false;
        }
      } catch (e: any) {
        console.warn("[FB-DEBUG] brainlover_invites read-back error:", e?.message);
        setParentError(
          t("ageGate.inviteSaveFailed", "We couldn't save your parent's invite. Please check your connection and try again — do not continue until this succeeds, or your parent won't be linked.")
        );
        return false;
      }

      // Store parent email for the child's later handleComplete (same device).
      localStorage.setItem("fb_parent_invite_email", cleanParentEmail);
      // Clear any stale deferred invites from previous test runs so
      // flushDeferredBrainLoverInvites in handleCompleteBrainLover
      // doesn't re-send OTP emails to the parent.
      localStorage.removeItem("fb_deferred_bl_invites");

      // Send the OTP immediately so the parent can verify now.
      const redirectParams = new URLSearchParams({ kind: "parent_invite" });
      if (childName) redirectParams.set("fb_name", childName);
      if (session?.user?.id) redirectParams.set("patient_id", session.user.id);

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanParentEmail,
        options: {
          emailRedirectTo: getOtpRedirectUrl(`/onboarding?${redirectParams.toString()}`),
          shouldCreateUser: true,
          data: {
            fb_invite_patient_id: session?.user?.id ?? null,
            fb_invite_patient_name: childName || null,
            fb_invite_patient_avatar: childPhoto || null,
            fb_invite_role: "brainlover",
            fb_invite_kind: "parent_invite",
            fb_invite_inviter_name: childName || null,
          },
        },
      });
      if (error) {
        setParentError(error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      setParentError(err.message || "Failed to send verification link.");
      return false;
    } finally {
      setParentLoading(false);
    }
  };

  const handleSendParentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const sent = await sendParentInvite(parentEmail);
    if (sent) {
      setParentSent(true);
      markResent(parentEmail);
      setCooldownMs(resendCooldownRemaining(parentEmail));
    }
  };

  const handleResendParentLink = async () => {
    if (resendCooldownRemaining(parentEmail) > 0) {
      setCooldownMs(resendCooldownRemaining(parentEmail));
      return;
    }
    const sent = await sendParentInvite(parentEmail);
    if (sent) {
      markResent(parentEmail);
      setResendCount((c) => c + 1);
      setCooldownMs(resendCooldownRemaining(parentEmail));
    }
  };

  // Dev-bypass: skip age gate entirely
  useEffect(() => {
    if (isDevBypass) { onComplete(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-enable the parent resend button when the 5-minute cooldown expires.
  useEffect(() => {
    if (cooldownMs <= 0) return;
    const timer = setTimeout(() => setCooldownMs(resendCooldownRemaining(parentEmail)), 30000);
    return () => clearTimeout(timer);
  }, [cooldownMs, parentEmail]);

  if (isDevBypass) return null;

  const continueDisabled = isCaregiver
    ? !dob || (age !== null && age < 18)
    : !dob || !childEmail.trim() || !(childName || "").trim();
  const showCaregiverDeadEnd = isCaregiver && age !== null && age < 18;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {!showParentConsent ? (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[clamp(1.75rem,5vw,2.5rem)] font-bold text-primary leading-tight">
                {t("ageGate.title", "Let's get to know you...")}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground mt-1">
                {t("ageGate.subtitle", "This helps us make sure FreeBrain is right for you.")}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {!isCaregiver && fileInputRef && onPhotoUpload && (
              <div className="flex flex-col items-center justify-center py-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={onPhotoUpload}
                />
                <div
                  className="h-28 w-28 md:h-32 md:w-32 rounded-full bg-muted border-4 border-primary/20 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors relative overflow-hidden group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {childPhoto ? (
                    <img src={childPhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs md:text-sm font-medium text-muted-foreground">
                        {t("onboarding.step8.addPhoto", "Add Photo")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
            {!isCaregiver && (
              <>
                <label className="text-lg font-semibold flex items-center gap-2">
                  {t("ageGate.nameLabel", "What should we call you?")}
                </label>
                <Input
                  type="text"
                  required
                  placeholder={t("ageGate.namePlaceholder", "Your first name or nickname")}
                  value={childName || ""}
                  onChange={(e) => onNameChange?.(e.target.value)}
                  className="h-14 text-xl border-2"
                />
                <label className="text-lg font-semibold flex items-center gap-2">
                  {t("ageGate.emailLabel", "Your Email")}
                </label>
                <Input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={childEmail}
                  onChange={(e) => handleChildEmailChange(e.target.value)}
                  className="h-14 text-xl border-2"
                />
              </>
            )}
            <label className="text-lg font-semibold flex items-center gap-2">
              {t("ageGate.birthdayLabel", "What year were you born?")}
            </label>
            <Select value={dob} onValueChange={handleYearChange}>
              <SelectTrigger className="h-14 text-xl border-2">
                <SelectValue placeholder={t("ageGate.birthdayPlaceholder", "Select year")} />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isCaregiver && age !== null && age < 18 && (
            <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl text-sm text-foreground">
              {t("ageGate.under18", "You must be at least 18 to set up an account on your own. A parent or guardian can help.")}
            </div>
          )}

          {showCaregiverDeadEnd ? (
            <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl text-sm text-foreground">
              {t("ageGate.caregiverUnder18", "BrainLovers must be 18 or older. Please ask a parent or guardian to support your FreeBrainer instead.")}
            </div>
          ) : (
            <Button
              type="button"
              className="w-full h-14 text-xl md:text-2xl font-bold shadow-lg"
              disabled={continueDisabled}
              onClick={handleContinue}
            >
              {t("ageGate.continue", "Continue")}
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[clamp(1.75rem,5vw,2.5rem)] font-bold text-primary leading-tight">
                {t("ageGate.parentTitle", "Parent or Guardian Required")}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground mt-1">
                {t("ageGate.parentSubtitle", "Since you are under 18, a parent or guardian needs to complete the setup first.")}
              </p>
            </div>
          </div>

          {parentSent ? (
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-6 md:p-8 flex flex-col items-center text-center space-y-4">
                <Hourglass className="h-16 w-16 text-primary" />
                <h3 className="text-2xl font-bold">
                  {t("ageGate.waitingTitle", "You're almost there!")}
                </h3>
                <p className="text-lg text-muted-foreground max-w-md">
                  {t("ageGate.waitingDesc", "Once your parent finishes their onboarding, we'll send you a link to finish yours.")}
                </p>
                <p className="text-base text-muted-foreground max-w-md">
                  {t("ageGate.waitingSentTo", "We sent the invite to:")}{" "}
                  <strong className="text-foreground">{parentEmail.trim()}</strong>
                </p>
                {resendCount > 0 && (
                  <p className="text-sm text-success font-medium">
                    {t("ageGate.waitingResent", "Link re-sent! Ask your parent to check their email.")}
                  </p>
                )}
                {parentError && (
                  <div className="w-full p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-sm font-medium">
                    {parentError}
                  </div>
                )}
                <div className="flex flex-col w-full gap-2">
                  <Button
                    variant="outline"
                    className="w-full h-14 text-lg font-bold"
                    onClick={handleResendParentLink}
                    disabled={parentLoading || cooldownMs > 0}
                  >
                    {parentLoading
                      ? t("onboarding.magicAuth.sending", "Sending...")
                      : t("ageGate.waitingResend", "Resend my parent their link")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  {cooldownMs > 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      {t("ageGate.waitingCooldown", {
                        minutes: cooldownMinutesLeft(cooldownMs),
                        defaultValue: `You can resend again in about ${cooldownMinutesLeft(cooldownMs)} min.`,
                      })}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => { setParentSent(false); setResendCount(0); setCooldownMs(0); }}
                  >
                    {t("ageGate.waitingChangeEmail", "Use a different parent email")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleSendParentLink} className="space-y-6">
              <div className="space-y-2">
                <label className="text-lg font-semibold flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  {t("ageGate.parentEmailLabel", "Parent or Guardian Email")}
                </label>
                <Input
                  type="email"
                  required
                  placeholder="parent@example.com"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="h-14 text-xl border-2"
                />
              </div>

              {parentError && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-sm font-medium">
                  {parentError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-14 text-xl md:text-2xl font-bold shadow-lg"
                disabled={parentLoading}
              >
                {parentLoading
                  ? t("onboarding.magicAuth.sending", "Sending...")
                  : t("ageGate.parentSend", "Send Verification Link")}
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </form>
          )}

          {onBack && (
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={onBack}
            >
              {t("onboarding.back", "Back")}
            </Button>
          )}
        </>
      )}
    </div>
  );
};
