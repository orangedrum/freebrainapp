import React from "react";
import { Button } from "@/components/ui/button";
import { Watch, Zap, Shield, ChevronRight, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Volume2 } from "lucide-react";
import { ConnectDeviceModal } from "@/components/profile/ConnectDeviceModal";
import { useState } from "react";

interface StepSymptomsProps {
  symptomText: string;
  setSymptomText: (text: string) => void;
  onContinue: () => void;
  onBack: () => void;
  speak?: (text: string) => void;
}

const GENERAL_WELLNESS_PARAMS = [
  "Movement Ease",
  "Flexibility & Range",
  "Energy Level",
  "Balance & Stability",
  "Focus & Mental Clarity",
];

const WEARABLE_PARAMS = [
  { name: "Gait & Step Symmetry", desc: "Requires Apple Watch or Wearable Sensor" },
  { name: "Tremor & Bradykinesia Index", desc: "Requires Movement Sensor" },
  { name: "Muscle Rigidity Score", desc: "Requires Biometric Wearable" },
  { name: "Heart Rate Recovery", desc: "Requires Pulse Monitor" },
];

export const StepSymptoms: React.FC<StepSymptomsProps> = ({
  symptomText,
  setSymptomText,
  onContinue,
  onBack,
  speak,
}) => {
  const { t } = useTranslation();
  const [selectedWearableParam, setSelectedWearableParam] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const toggleWellnessParam = (param: string) => {
    const current = symptomText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (current.includes(param)) {
      setSymptomText(current.filter((s) => s !== param).join(", "));
    } else {
      setSymptomText([...current, param].join(", "));
    }
  };

  const handleWearableClick = (paramName: string) => {
    setSelectedWearableParam(paramName);
    setIsConnectModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            {t("onboarding.symptomsTitle", "What wellness parameters are you focusing on today?")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("onboarding.symptomsSubtitle", "Select general wellness goals. Clinical device parameters are synced automatically via wearables.")}
          </p>
        </div>
        {speak && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={() =>
              speak(
                `${t("onboarding.symptomsTitle")}. Select general wellness goals.`
              )
            }
          >
            <Volume2 className="h-5 w-5 text-primary" />
          </Button>
        )}
      </div>

      {/* General Wellness Quick Tags */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-gold" />
          {t("onboarding.generalWellness", "General Wellness Goals")}
        </label>
        <div className="flex flex-wrap gap-2">
          {GENERAL_WELLNESS_PARAMS.map((param) => {
            const isSelected = symptomText
              .split(",")
              .map((s) => s.trim())
              .includes(param);
            return (
              <Button
                key={param}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => toggleWellnessParam(param)}
                className="rounded-full text-xs font-semibold transition-all"
              >
                {param} {isSelected && "✓"}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Wearable / Sensor Parameters (Grayed Out) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Watch className="h-3.5 w-3.5 text-primary" />
          {t("onboarding.biometricMetrics", "Biometric Wearable Metrics (Requires Device)")}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {WEARABLE_PARAMS.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => handleWearableClick(item.name)}
              className="p-2.5 rounded-xl border border-dashed bg-muted/20 hover:bg-muted/40 transition-colors text-left flex items-start justify-between opacity-75 hover:opacity-100 group"
            >
              <div>
                <p className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1.5">
                  {item.name}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">{item.desc}</p>
              </div>
              <span className="shrink-0 p-1 rounded-md bg-muted/60 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                <Lock className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* General Disclaimer Badge */}
      <div className="p-3 rounded-xl bg-muted/30 border text-[11px] text-muted-foreground flex items-center gap-2">
        <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
        <span>{t("onboarding.disclaimer", "FreeBrain tracks wellness & habit consistency for personal support. Not a medical diagnostic tool.")}</span>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          {t("common.back", "Back")}
        </Button>
        <Button
          onClick={onContinue}
          disabled={!symptomText.trim()}
          className="font-bold px-6 bg-primary text-primary-foreground"
        >
          {t("common.continue", "Continue")}
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

      {/* Connect Device Modal */}
      <ConnectDeviceModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        metricName={selectedWearableParam || undefined}
      />
    </div>
  );
};
