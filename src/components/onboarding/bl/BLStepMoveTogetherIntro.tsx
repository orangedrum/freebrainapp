/**
 * BLStepMoveTogetherIntro — Step 6 of the BrainLover onboarding flow.
 *
 * Intro text before the video: "Grab [FreeBrainer]. We're going to do our
 * first follow along short exercise!" with a big "Let's go" button and a
 * text link to skip if the FreeBrainer isn't available.
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Volume2, ChevronRight, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BLStepMoveTogetherIntroProps {
  freeBrainerName: string;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
  speak: (text: string) => void;
}

export const BLStepMoveTogetherIntro: React.FC<BLStepMoveTogetherIntroProps> = ({
  freeBrainerName,
  onNext,
  onSkip,
  onBack,
  speak,
}) => {
  const { t } = useTranslation();
  const name = freeBrainerName || t("onboarding.bl.yourFreeBrainer", "your FreeBrainer");

  const introText = t("onboarding.bl.moveTogetherIntro", {
    name,
    defaultValue: "Grab " + name + ". We're going to do our first follow along short exercise!",
  });

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight">
          {t("onboarding.bl.moveTogetherTitle", "Let's move together!")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
          onClick={() => speak(introText)}
        >
          <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-6 py-8">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Activity className="h-12 w-12 text-primary" />
        </div>
        <p className="text-lg md:text-xl text-muted-foreground text-center max-w-md">
          {introText}
        </p>
      </div>

      <div className="flex flex-col gap-3 md:gap-4">
        <Button className="w-full h-16 md:h-20 text-xl md:text-2xl font-bold" onClick={onNext}>
          {t("onboarding.bl.letsGo", "Let's go!")}
          <ChevronRight className="ml-2 h-6 w-6 md:h-8 md:w-8" />
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-base text-muted-foreground hover:text-primary transition-colors py-2 min-h-[44px]"
        >
          {t("onboarding.bl.notAvailable", "My FreeBrainer isn't available right now")}
        </button>
        <Button variant="ghost" className="w-full h-12 text-lg" onClick={onBack}>
          {t("onboarding.back", "Back")}
        </Button>
      </div>
    </div>
  );
};
