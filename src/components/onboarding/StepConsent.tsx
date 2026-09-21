/**
 * StepConsent — Parental consent step for parent invites.
 *
 * Simple checkbox: "I consent to my child using FreeBrain"
 * Legal text about privacy and data usage.
 *
 * @param onComplete  — advance to next state
 * @param onBack      — go to previous state
 * @param speak       — text-to-speech helper
 */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, ChevronRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StepConsentProps {
  onComplete: () => void;
  onBack: () => void;
  speak: (text: string) => void;
}

export const StepConsent: React.FC<StepConsentProps> = ({ onComplete, onBack, speak }) => {
  const { t } = useTranslation();
  const [consented, setConsented] = useState(false);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight text-center w-full">
          {t("onboarding.bl.consentTitle", "Parental Consent")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20 absolute top-0 right-0"
          onClick={() =>
            speak(
              `${t("onboarding.bl.consentTitle", "Parental Consent")}. ${t(
                "onboarding.bl.consentText",
                "I consent to my child using FreeBrain. I understand it is a movement habit tracker for general wellness and community support."
              )}`
            )
          }
        >
          <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-4 py-6">
        <div className="p-6 rounded-full bg-primary/10">
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-base md:text-lg text-muted-foreground text-center leading-relaxed">
          {t(
            "onboarding.bl.consentText",
            "I consent to my child using FreeBrain. I understand it is a movement habit tracker for general wellness and community support."
          )}
        </p>

        <div className="p-4 bg-muted/30 rounded-xl border text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">
            {t("onboarding.magicAuth.disclaimerTitle", "Medical & Privacy Disclaimer:")}
          </span>{" "}
          {t(
            "onboarding.magicAuth.disclaimerText",
            "FreeBrain is a fitness and movement habit tracker for general wellness and community support. It is not a medical device, diagnostic tool, or clinical record keeper."
          )}
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 hover:border-primary/50 transition-colors">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm md:text-base text-muted-foreground">
          {t("onboarding.bl.consentCheckbox", "I have read and agree to the Terms of Service and Privacy Policy")}
        </span>
      </label>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-14 md:h-16 text-base md:text-lg font-semibold"
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          {t("common.back", "Back")}
        </Button>
        <Button
          className="flex-[2] h-14 md:h-16 text-base md:text-lg font-semibold"
          onClick={onComplete}
          disabled={!consented}
        >
          {t("onboarding.bl.consentButton", "I agree")}
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
