/**
 * BLStepGetSample — Invited BrainLover "Get a Sample" step.
 *
 * "Grab your FreeBrainer [name], and do a video together, or try one by yourself"
 * CTA: "I'm Ready" → advances to the sample video step.
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Volume2, ChevronRight, ArrowLeft, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BLStepGetSampleProps {
  freeBrainerName: string;
  onNext: () => void;
  onBack: () => void;
  speak: (text: string) => void;
}

export const BLStepGetSample: React.FC<BLStepGetSampleProps> = ({
  freeBrainerName,
  onNext,
  onBack,
  speak,
}) => {
  const { t } = useTranslation();
  const name = freeBrainerName || t("onboarding.bl.yourFreeBrainer", "your FreeBrainer");

  const sampleText = t("onboarding.bl.getSample", {
    name,
    defaultValue: `Grab your FreeBrainer ${name}, and do a video together, or try one by yourself`,
  });

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight">
          {t("onboarding.bl.getSampleTitle", "Get a Sample")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
          onClick={() => speak(sampleText)}
        >
          <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-6 py-8">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Activity className="h-12 w-12 text-primary" />
        </div>
        <p className="text-lg md:text-xl text-muted-foreground text-center max-w-md">
          {sampleText}
        </p>
      </div>

      <div className="flex flex-col gap-3 md:gap-4">
        <Button className="w-full h-16 md:h-20 text-xl md:text-2xl font-bold" onClick={onNext}>
          {t("onboarding.bl.imReady", "I'm Ready")}
          <ChevronRight className="ml-2 h-6 w-6 md:h-8 md:w-8" />
        </Button>
        <Button variant="ghost" className="w-full h-12 text-lg" onClick={onBack}>
          <ArrowLeft className="mr-2 h-5 w-5" /> {t("onboarding.back", "Back")}
        </Button>
      </div>
    </div>
  );
};
