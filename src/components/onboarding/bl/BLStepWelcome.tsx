/**
 * BLStepWelcome — Step 1 of the BrainLover onboarding flow.
 *
 * "You must really love someone's brain!" — welcome screen with FreeBrain logo.
 * CTA: "Get Started."
 *
 * @param onNext  — advance to step 2 (profile)
 * @param speak    — text-to-speech helper
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Volume2, ChevronRight, Activity, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BLStepWelcomeProps {
  onNext: () => void;
  speak: (text: string) => void;
}

export const BLStepWelcome: React.FC<BLStepWelcomeProps> = ({ onNext, speak }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* FreeBrain logo */}
      <div className="flex items-center justify-center gap-2 pt-4">
        <div className="p-3 rounded-2xl bg-primary/15">
          <Activity className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-heading font-bold text-2xl text-primary">FreeBrain</h1>
      </div>

      <div className="flex items-start justify-between">
        <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight text-center w-full">
          {t("onboarding.bl.welcomeTitle", "You must really love someone's brain!")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20 absolute top-0 right-0"
          onClick={() =>
            speak(
              `${t("onboarding.bl.welcomeTitle", "You must really love someone's brain!")}. ${t(
                "onboarding.bl.welcomeRole",
                "That makes you a FreeBrain BrainLover — someone who keeps their loved one moving daily."
              )}`
            )
          }
        >
          <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </Button>
      </div>

      <p className="text-lg md:text-xl text-muted-foreground text-center">
        {t(
          "onboarding.bl.welcomeRole",
          "That makes you a FreeBrain BrainLover — someone who keeps their loved one moving daily."
        )}
      </p>

      <div className="flex justify-center py-4">
        <div className="p-6 rounded-full bg-primary/10">
          <Heart className="h-12 w-12 text-primary" />
        </div>
      </div>

      <Button className="w-full h-16 md:h-20 text-xl md:text-2xl font-bold" onClick={onNext}>
        {t("onboarding.bl.getStarted", "Get Started")}
        <ChevronRight className="ml-2 h-6 w-6 md:h-8 md:w-8" />
      </Button>
    </div>
  );
};
