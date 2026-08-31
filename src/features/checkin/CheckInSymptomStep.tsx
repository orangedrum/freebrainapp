import React from "react";
import { useTranslation } from "react-i18next";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Watch, CheckCircle2 } from "lucide-react";
import type { CheckinStatus } from "./useCheckInData";

interface CheckInSymptomStepProps {
  userSymptoms: string[];
  symptomLevels: Record<string, number>;
  setSymptomLevels: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  checkinStatus: CheckinStatus;
  deviceTrackedSymptoms?: { name: string; value: number; unit: string }[];
  onBack: () => void;
  onContinue: () => void;
}

export const CheckInSymptomStep: React.FC<CheckInSymptomStepProps> = ({
  userSymptoms,
  symptomLevels,
  setSymptomLevels,
  checkinStatus,
  deviceTrackedSymptoms = [],
  onBack,
  onContinue,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
      {/* Device-tracked symptoms (read-only) */}
      {deviceTrackedSymptoms.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Watch className="h-3.5 w-3.5 text-primary" />
            {t("checkin.deviceTracked", "Device-Tracked Metrics")}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {deviceTrackedSymptoms.map((metric) => (
              <div
                key={metric.name}
                className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">{metric.name}</span>
                </div>
                <span className="text-sm font-bold text-primary">
                  {metric.value} {metric.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual wellness sliders */}
      {userSymptoms.length > 0 ? (
        <div className="space-y-12 max-w-2xl mx-auto py-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("checkin.wellnessMetrics", "Wellness Metrics")}
          </div>
          {userSymptoms.map((symptom) => (
            <div key={symptom} className="space-y-6 bg-muted/30 p-6 rounded-2xl border-2 border-muted">
              <div className="flex flex-col items-center gap-4">
                <Label className="text-2xl md:text-3xl font-bold capitalize text-center">{symptom}</Label>
                <div className="text-[clamp(4rem,10vw,4.5rem)] font-bold text-primary leading-none">
                  {symptomLevels[symptom] ?? 0}
                  <span className="text-2xl md:text-3xl text-muted-foreground">/10</span>
                </div>
              </div>
              <div className="py-8 px-2">
                <Slider
                  min={0}
                  max={10}
                  step={1}
                  value={[symptomLevels[symptom] ?? 0]}
                  onValueChange={(val) => setSymptomLevels((prev) => ({ ...prev, [symptom]: val[0] }))}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-base md:text-lg font-medium text-muted-foreground px-2">
                <span>{t("checkin.mild", "Bad")}</span>
                <span>{t("checkin.severe", "Great")}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {t("checkin.noSymptoms", "No symptoms to track.")}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
        <Button variant="ghost" className="h-14" onClick={() => onBack()}>
          {t("checkin.goBack", "Go Back")}
        </Button>
        <Button size="lg" className="h-14 min-w-[200px] text-lg font-bold" onClick={onContinue}>
          {t("checkin.continue", "Continue")}
        </Button>
      </div>
    </div>
  );
};
