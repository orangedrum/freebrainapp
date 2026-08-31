import React from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "react-i18next";

import { Volume2 } from "lucide-react";

interface StepMobilityProps {
  mobility: number[];
  setMobility: (val: number[]) => void;
  onNext: () => void;
  onBack: () => void;
  speak?: (text: string) => void;
}

export const StepMobility: React.FC<StepMobilityProps> = ({
  mobility,
  setMobility,
  onNext,
  onBack,
  speak,
}) => {
  const { t } = useTranslation();

  const getMobilityLabel = (val: number) => {
    if (val <= 3) return t("onboarding.mobilityLow", "Low — Seated / Gentle movements");
    if (val <= 7) return t("onboarding.mobilityModerate", "Moderate — Standing & Light Walking");
    return t("onboarding.mobilityHigh", "High — Active Standing & Dynamic Exercises");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            {t("onboarding.mobilityTitle", "How is your current mobility?")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("onboarding.mobilityDesc", "Slide to select your usual mobility level today so we match safe, tailored exercises.")}
          </p>
        </div>
        {speak && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={() =>
              speak(
                `${t("onboarding.mobilityTitle")}. ${t("onboarding.mobilityDesc")}. Current level is ${mobility[0]} out of 10.`
              )
            }
          >
            <Volume2 className="h-5 w-5 text-primary" />
          </Button>
        )}
      </div>

      <div className="space-y-6 bg-muted/30 p-6 rounded-xl border">
        <div className="text-center space-y-1">
          <span className="text-4xl font-extrabold text-primary">{mobility[0]} / 10</span>
          <p className="text-base font-semibold">{getMobilityLabel(mobility[0])}</p>
        </div>

        <Slider
          value={mobility}
          onValueChange={setMobility}
          min={1}
          max={10}
          step={1}
          className="py-4"
        />

        <div className="flex justify-between text-xs text-muted-foreground font-medium">
          <span>1 (Minimal)</span>
          <span>5 (Moderate)</span>
          <span>10 (Full)</span>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          {t("common.back", "Back")}
        </Button>
        <Button onClick={onNext} className="font-bold px-6">
          {t("common.next", "Next")}
        </Button>
      </div>
    </div>
  );
};
