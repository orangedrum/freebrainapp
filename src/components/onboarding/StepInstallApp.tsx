/**
 * StepInstallApp — Final onboarding step (step 15).
 *
 * Shows the "You did it! Get the FreeBrain app" install prompt
 * right after the user's profile is saved and email is verified.
 * This is the peak emotional moment — they just committed to daily movement.
 *
 * Platform-aware:
 *  - Android/Chrome: native `beforeinstallprompt` (one-tap install)
 *  - iOS: 3-step visual guide (Share → Add to Home Screen)
 *  - Desktop: QR code + "Email me a link"
 *
 * The "Continue to Dashboard" button lets them skip and proceed.
 *
 * i18n: all strings via `t("pwa.install.*")` and `t("onboarding.step15.*")`.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { InstallPromptCard } from "@/components/shared/InstallPromptCard";

interface StepInstallAppProps {
  /** Email address of the authenticated user (for "send to phone" on desktop) */
  userEmail: string;
  /** Called when user clicks "Continue to Dashboard" */
  onContinue: () => void;
  /** Optional text-to-speech helper */
  speak?: (text: string) => void;
}

export const StepInstallApp: React.FC<StepInstallAppProps> = ({
  userEmail,
  onContinue,
  speak,
}) => {
  const { t } = useTranslation();
  const { platform, canInstall, isInstalled, promptInstall, markInstallShown } = usePWAInstall();

  const handleContinue = () => {
    markInstallShown();
    onContinue();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-bold text-primary leading-tight">
            {t("onboarding.step15.title", "You're all set!")}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground mt-1">
            {t("onboarding.step15.subtitle", "Your profile is saved. Now get the app for daily check-ins.")}
          </p>
        </div>
        {speak && (
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={() =>
              speak(
                `${t("onboarding.step15.title", "You're all set!")} ${t("onboarding.step15.subtitle", "Your profile is saved. Now get the app for daily check-ins.")}`
              )
            }
          >
            <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          </Button>
        )}
      </div>

      {/* Install prompt card (platform-aware) */}
      {!isInstalled && (
        <InstallPromptCard
          platform={platform}
          canInstall={canInstall}
          isInstalled={isInstalled}
          onPromptInstall={promptInstall}
          userEmail={userEmail}
        />
      )}

      {/* Already installed or skip */}
      <Button
        className="w-full h-14 md:h-16 text-lg md:text-xl font-bold"
        onClick={handleContinue}
      >
        {isInstalled
          ? t("onboarding.step15.continue", "Continue to Dashboard")
          : t("onboarding.step15.skip", "Maybe later — take me to my dashboard")}
        <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6" />
      </Button>
    </div>
  );
};
