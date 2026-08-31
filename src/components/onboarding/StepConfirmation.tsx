import React from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StepConfirmationProps {
  step: number;
  onNext: () => void;
  onComplete: () => void;
  isProcessing: boolean;
  speak: (text: string) => void;
}

export const StepConfirmation: React.FC<StepConfirmationProps> = ({
  step,
  onNext,
  onComplete,
  isProcessing,
  speak,
}) => {
  const { t } = useTranslation();

  if (step === 13) {
    return (
      <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between">
          <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-bold text-primary leading-tight">
            {t("onboarding.step13.title", "Are you ready?")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={() =>
              speak(
                `${t("onboarding.step13.title")}. ${t("onboarding.step13.desc1")} ${t(
                  "onboarding.step13.desc2"
                )} ${t("onboarding.step13.desc3")}`
              )
            }
          >
            <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          </Button>
        </div>
        <div className="py-4 md:py-8">
          <p className="text-[clamp(1.25rem,3.5vw,1.875rem)] leading-relaxed font-medium">
            {t("onboarding.step13.desc1", "Consistency is key. Every small movement count towards your health.")}{" "}
            <span className="text-primary font-bold">
              {t("onboarding.step13.desc2", "Let's build a daily habit together!")}
            </span>
          </p>
        </div>
        <Button className="w-full h-16 md:h-24 text-2xl md:text-3xl font-bold" onClick={onNext}>
          {t("onboarding.step13.really", "Yes! Let's do this")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-bold text-primary leading-tight">
          {t("onboarding.step14.title", "Select your first daily check-in")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
          onClick={() =>
            speak(
              `${t("onboarding.step14.title")}. ${t("onboarding.step14.options")}. ${t(
                "onboarding.step14.moved"
              )}. ${t("onboarding.step14.tried")}. ${t("onboarding.step14.rest")}`
            )
          }
        >
          <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </Button>
      </div>
      <div className="py-4 md:py-6 space-y-4 md:space-y-6">
        <p className="text-xl md:text-2xl font-medium">
          {t("onboarding.step14.options", "How did you do today?")}
        </p>
        <div className="space-y-3 md:space-y-4">
          <div className="bg-muted/50 p-4 md:p-6 rounded-2xl border-2 flex items-center gap-4">
            <span className="text-3xl md:text-4xl">✅</span>
            <span className="text-xl md:text-2xl font-bold">
              {t("onboarding.step14.moved", "I moved today")}
            </span>
          </div>
          <div className="bg-muted/50 p-4 md:p-6 rounded-2xl border-2 flex items-center gap-4">
            <span className="text-3xl md:text-4xl">💪</span>
            <span className="text-xl md:text-2xl font-bold">
              {t("onboarding.step14.tried", "I tried my best")}
            </span>
          </div>
          <div className="bg-muted/50 p-4 md:p-6 rounded-2xl border-2 flex items-center gap-4">
            <span className="text-3xl md:text-4xl">🛌</span>
            <span className="text-xl md:text-2xl font-bold">
              {t("onboarding.step14.rest", "Resting day")}
            </span>
          </div>
        </div>
      </div>
      <Button
        className="w-full h-16 md:h-24 text-2xl md:text-3xl font-bold shadow-xl"
        onClick={onComplete}
        disabled={isProcessing}
      >
        {isProcessing
          ? t("onboarding.step14.saving", "Saving...")
          : t("onboarding.step14.complete", "Continue to Save Profile")}
        <Check className="ml-2 md:ml-3 h-6 w-6 md:h-8 md:w-8" />
      </Button>
    </div>
  );
};
