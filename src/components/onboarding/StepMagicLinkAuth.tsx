import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Volume2, Mail, CheckCircle2, ArrowRight, Smartphone, Loader2, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { isDevBypassUser } from "@/lib/devBypass";
import { IOSInstallGuide } from "@/components/shared/IOSInstallGuide";
import { getOtpRedirectUrl } from "@/lib/otpRedirect";
import { useAuth } from "@/contexts/AuthContext";

// Detect iOS for showing the manual install guide
const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

interface StepMagicLinkAuthProps {
  onComplete: () => void;
  isProcessing: boolean;
  speak?: (text: string) => void;
  /** Optional custom heading (e.g. "1 more step!" for invited BrainLovers) */
  customTitle?: string;
  /** Optional custom subtitle */
  customSubtitle?: string;
  /** Optional custom send button label */
  customButtonLabel?: string;
  /** If provided, show confirmation message instead of email input */
  email?: string | null;
  /** Callback to resend the magic link */
  onResend?: () => void;
}

export const StepMagicLinkAuth: React.FC<StepMagicLinkAuthProps> = ({
  onComplete,
  isProcessing,
  speak,
  customTitle,
  customSubtitle,
  customButtonLabel,
  email,
  onResend,
}) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const location = useLocation();
  const [emailInput, setEmailInput] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const isDevBypass = isDevBypassUser(undefined);

  // ── Confirmation mode (email pre-captured): session matching ──
  // There is deliberately NO Continue button here. Forward motion happens
  // ONLY by auto-advancing when the signed-in session provably owns the
  // listed address (magic-link click = email confirmation). A mismatched
  // session (e.g. the parent verified on this same browser) must NEVER be
  // able to complete this onboarding — that would write one person's data
  // onto another person's account.
  const stateEmail = (email || "").trim().toLowerCase();
  const sessionEmail = session?.user?.email?.toLowerCase() || null;
  const emailMatches = !!stateEmail && sessionEmail === stateEmail;
  const sessionVerified = !!session?.user && (!!session.user.email_confirmed_at || isDevBypass);
  const advancedRef = useRef(false);
  useEffect(() => {
    if (!email || emailSent || advancedRef.current) return;
    if (sessionVerified && emailMatches) {
      advancedRef.current = true;
      onComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, emailSent, sessionVerified, emailMatches]);

  const handleSignOutMismatch = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } finally {
      setSigningOut(false);
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const redirectPath = `/onboarding${location.search || "?install=1"}`;

      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.trim(),
        options: {
          emailRedirectTo: getOtpRedirectUrl(redirectPath),
          shouldCreateUser: true,
        },
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setEmailSent(true);
        onComplete();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send login link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[clamp(1.75rem,5vw,2.5rem)] font-bold text-primary leading-tight">
            {customTitle || t("onboarding.magicAuth.title", "Welcome to FreeBrain")}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground mt-1">
            {customSubtitle || t("onboarding.magicAuth.subtitle", "Enter your email below to save your profile and receive a magic login link. No password needed!")}
          </p>
        </div>
        {speak && (
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={() =>
              speak(
                `${customTitle || t("onboarding.magicAuth.title", "Welcome to FreeBrain")}. ${customSubtitle || t("onboarding.magicAuth.subtitle", "Enter your email below to save your profile and receive a magic login link.")}`
              )
            }
          >
            <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          </Button>
        )}
      </div>

      {email && !emailSent ? (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-6 md:p-8 flex flex-col items-center text-center space-y-4">
            <Mail className="h-16 w-16 text-primary animate-bounce" />
            <h3 className="text-2xl font-bold">
              {t("onboarding.magicAuth.lastStepTitle", "Last Step!")}
            </h3>
            <p className="text-lg text-muted-foreground max-w-md">
              {t("onboarding.magicAuth.lastStepDesc", "Go check your email on your phone!")}
            </p>
            <p className="text-base text-muted-foreground max-w-md">
              {t("onboarding.magicAuth.confirmationSent", "We sent a confirmation email to this email:")}{" "}
              <strong className="text-foreground">{email}</strong>
            </p>
            {sessionVerified && emailMatches ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-lg font-semibold">
                  {t("onboarding.magicAuth.verifiedTitle", "Email verified! Setting up your account…")}
                </p>
              </div>
            ) : (
              <>
                {session?.user && !emailMatches && (
                  <div className="w-full p-4 bg-warning/10 border border-warning/30 rounded-xl text-left space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      {t("onboarding.magicAuth.mismatchTitle", "Wrong account for this signup")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("onboarding.magicAuth.mismatchDesc", {
                        signedIn: sessionEmail || "",
                        expected: stateEmail,
                        defaultValue: `This browser is signed in as ${sessionEmail || "someone else"}, but this signup is for ${stateEmail}. Sign out first, then open your own link.`,
                      })}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSignOutMismatch}
                      disabled={signingOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t("onboarding.magicAuth.mismatchSignOut", "Sign out")}
                    </Button>
                  </div>
                )}
                {onResend && (
                  <Button variant="outline" size="sm" onClick={onResend} className="mt-2">
                    {t("onboarding.magicAuth.resend", "Resend link")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            <div className="w-full p-4 rounded-xl bg-info/10 border border-info/30 text-left">
              <p className="text-sm font-semibold text-foreground">
                {t("onboarding.magicAuth.invitesDeferredTitle", "Invited parties will be notified after you confirm")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("onboarding.magicAuth.invitesDeferredDesc", "Any FreeBrainers or BrainLovers you invited during onboarding will receive their invitation once you confirm your email and your account is active.")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : emailSent ? (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-6 md:p-8 flex flex-col items-center text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-primary animate-bounce" />
            <h3 className="text-2xl font-bold">
              {t("onboarding.magicAuth.sentTitle", "One More Step!")}
            </h3>
            <p className="text-lg text-muted-foreground max-w-md">
              {t("onboarding.magicAuth.sentDesc", "We sent a magic login link to")}{" "}
              <strong className="text-foreground">{email}</strong>.
            </p>
            <p className="text-base text-muted-foreground max-w-md">
              {t("onboarding.magicAuth.confirmInstructions", "Click the link in your email to confirm your account and access your dashboard.")}
            </p>
            <div className="w-full p-4 rounded-xl bg-info/10 border border-info/30 text-left">
              <p className="text-sm font-semibold text-foreground">
                {t("onboarding.magicAuth.invitesDeferredTitle", "Invited parties will be notified after you confirm")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("onboarding.magicAuth.invitesDeferredDesc", "Any FreeBrainers or BrainLovers you invited during onboarding will receive their invitation once you confirm your email and your account is active.")}
              </p>
            </div>
            <div className="pt-2 text-sm text-muted-foreground">
              {t("onboarding.magicAuth.spamNotice", "Didn't receive it? Check your spam folder or try re-entering your email.")}
            </div>
            <Button variant="outline" size="sm" onClick={() => setEmailSent(false)} className="mt-2">
              {t("onboarding.magicAuth.tryAnother", "Try another email")}
            </Button>
            {isDevBypass && (
              <Button
                className="w-full h-14 text-lg mt-2"
                onClick={() => {
                  const role = localStorage.getItem("dev_role_override") || "caregiver";
                  window.location.href = role === "pro" ? "/pro" : role === "freebrainer" ? "/overview" : "/caregiver";
                }}
              >
                {t("onboarding.magicAuth.continueToDashboard", "Continue to Dashboard")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
            <div className="w-full mt-4 p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3 text-left">
              <Smartphone className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-semibold text-sm text-foreground">
                  {t("pwa.onboarding.nudgeTitle", "Open this email on your phone")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("pwa.onboarding.nudgeDesc", "Tap the link from your phone to install FreeBrain as an app — quick daily check-ins right from your home screen.")}
                </p>
                {isIOSDevice && (
                  <div className="mt-3">
                    <IOSInstallGuide />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSendMagicLink} className="space-y-6">
          <div className="space-y-2">
            <label className="text-lg font-semibold flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              {t("onboarding.magicAuth.emailLabel", "Your Email Address")}
            </label>
            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="h-16 text-xl border-2"
            />
          </div>

          <div className="p-4 bg-muted/30 rounded-xl border text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">{t("onboarding.magicAuth.disclaimerTitle", "Medical & Privacy Disclaimer:")}</span> {t("onboarding.magicAuth.disclaimerText", "FreeBrain is a fitness and movement habit tracker for general wellness and community support. It is not a medical device, diagnostic tool, or clinical record keeper.")}
          </div>

          {errorMessage && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-sm font-medium">
              {errorMessage}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-16 md:h-20 text-xl md:text-2xl font-bold shadow-lg"
            disabled={isLoading || isProcessing}
          >
            {isLoading ? t("onboarding.magicAuth.sending", "Sending Magic Link...") : (customButtonLabel || t("onboarding.magicAuth.sendButton", "Save Profile & Send Magic Link"))}
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </form>
      )}
    </div>
  );
};
