import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { Mail, ArrowRight, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isDevBypassUser } from "@/lib/devBypass";
import { getOtpRedirectUrl } from "@/lib/otpRedirect";
import { useAuth } from "@/contexts/AuthContext";

interface StepAgeGateProps {
  onComplete: () => void;
  onBack?: () => void;
}

export const StepAgeGate: React.FC<StepAgeGateProps> = ({ onComplete, onBack }) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [dob, setDob] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [showParentConsent, setShowParentConsent] = useState(false);
  const [parentEmail, setParentEmail] = useState("");
  const [parentSent, setParentSent] = useState(false);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState("");
  const [parentVerified, setParentVerified] = useState(false);
  const isDevBypass = isDevBypassUser(undefined);

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let calculatedAge = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--;
    }
    return calculatedAge;
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDob(value);
    if (value) {
      const calculatedAge = calculateAge(value);
      setAge(calculatedAge);
    } else {
      setAge(null);
    }
  };

  const handleContinue = () => {
    if (!dob) return;
    if (age !== null && age >= 18) {
      onComplete();
    } else {
      setShowParentConsent(true);
    }
  };

  const handleSendParentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentEmail.trim()) return;
    setParentLoading(true);
    setParentError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: parentEmail.trim(),
        options: {
          emailRedirectTo: getOtpRedirectUrl("/onboarding?parent=true"),
          shouldCreateUser: true,
        },
      });
      if (error) {
        setParentError(error.message);
      } else {
        setParentSent(true);
      }
    } catch (err: any) {
      setParentError(err.message || "Failed to send verification link.");
    } finally {
      setParentLoading(false);
    }
  };

  // Dev-bypass: skip age gate entirely
  useEffect(() => {
    if (isDevBypass) { onComplete(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isDevBypass) return null;

  // Parent verified via magic link
  useEffect(() => {
    if (parentVerified || (session?.user && parentSent)) {
      onComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentVerified, session?.user, parentSent]);

  if (parentVerified || (session?.user && parentSent)) return null;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {!showParentConsent ? (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[clamp(1.75rem,5vw,2.5rem)] font-bold text-primary leading-tight">
                {t("ageGate.title", "How old are you?")}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground mt-1">
                {t("ageGate.subtitle", "This helps us make sure FreeBrain is right for you.")}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-lg font-semibold flex items-center gap-2">
              {t("ageGate.birthdayLabel", "Date of Birth")}
            </label>
            <Input
              type="date"
              value={dob}
              onChange={handleDobChange}
              className="h-14 text-xl border-2"
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          {age !== null && age < 18 && (
            <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl text-sm text-foreground">
              {t("ageGate.under18", "You must be at least 18 to set up an account on your own. A parent or guardian can help.")}
            </div>
          )}

          <Button
            type="button"
            className="w-full h-14 text-xl md:text-2xl font-bold shadow-lg"
            disabled={!dob}
            onClick={handleContinue}
          >
            {t("ageGate.continue", "Continue")}
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
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
                <Shield className="h-16 w-16 text-primary animate-bounce" />
                <h3 className="text-2xl font-bold">
                  {t("ageGate.parentSent", "Check your email!")}
                </h3>
                <p className="text-lg text-muted-foreground max-w-md">
                  {t("ageGate.parentNudge", "Have a parent verify to continue.")}
                </p>
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
