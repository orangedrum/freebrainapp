/**
 * WellnessParamsSelector — pill-based wellness parameter selector.
 *
 * Reuses the same GENERAL_WELLNESS_PARAMS and WEARABLE_PARAMS from
 * onboarding's StepSymptoms. Users tap pills to toggle tracking.
 *
 * When deselecting a previously tracked param, shows a warning that
 * prior collected data for that param will remain in localStorage
 * (Tier 1) but will no longer be actively tracked.
 *
 * Tier 1: wellness params stored in localStorage via symptomStorage.
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Watch, Lock, Shield, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConnectDeviceModal } from "@/components/profile/ConnectDeviceModal";

// ── Same constants as onboarding StepSymptoms ──
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

interface WellnessParamsSelectorProps {
  selectedParams: string[];
  onParamsChange: (params: string[]) => void;
}

export function WellnessParamsSelector({ selectedParams, onParamsChange }: WellnessParamsSelectorProps) {
  const { t } = useTranslation();
  const [showDeselectWarning, setShowDeselectWarning] = useState<string | null>(null);
  const [selectedWearableParam, setSelectedWearableParam] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const toggleParam = (param: string) => {
    if (selectedParams.includes(param)) {
      // Show warning before deselecting
      setShowDeselectWarning(param);
    } else {
      onParamsChange([...selectedParams, param]);
    }
  };

  const confirmDeselect = () => {
    if (showDeselectWarning) {
      onParamsChange(selectedParams.filter((p) => p !== showDeselectWarning));
    }
    setShowDeselectWarning(null);
  };

  const handleWearableClick = (paramName: string) => {
    setSelectedWearableParam(paramName);
    setIsConnectModalOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-gold" />
          {t("profile.wellnessParamsTitle", "Wellness Parameters")}
        </CardTitle>
        <CardDescription>
          {t("onboarding.symptomsSubtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* General Wellness Pills */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-gold" />
            {t("onboarding.generalWellness")}
          </label>
          <div className="flex flex-wrap gap-2">
            {GENERAL_WELLNESS_PARAMS.map((param) => {
              const isSelected = selectedParams.includes(param);
              return (
                <Button
                  key={param}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleParam(param)}
                  className="rounded-full text-sm font-semibold transition-all min-h-[44px]"
                  aria-pressed={isSelected}
                >
                  {param} {isSelected && "✓"}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Wearable / Sensor Parameters */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Watch className="h-3.5 w-3.5 text-primary" />
            {t("onboarding.biometricMetrics")}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {WEARABLE_PARAMS.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => handleWearableClick(item.name)}
                className="p-3 rounded-xl border border-dashed bg-muted/20 hover:bg-muted/40 transition-colors text-left flex items-start justify-between opacity-75 hover:opacity-100 group min-h-[44px]"
              >
                <div>
                  <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">{item.desc}</p>
                </div>
                <span className="shrink-0 p-1.5 rounded-md bg-muted/60 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                  <Lock className="h-4 w-4" />
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="p-3 rounded-xl bg-muted/30 border text-xs text-muted-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-success shrink-0" />
          <span>{t("onboarding.disclaimer")}</span>
        </div>

        {/* Deselect warning */}
        {showDeselectWarning && (
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">
                  {t("profile.deselectWarningTitle", "Stop tracking this parameter?")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("profile.deselectWarningDesc", "Previously recorded data for \"{{param}}\" will remain on your device but won't be actively tracked going forward.", { param: showDeselectWarning })}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowDeselectWarning(null)}>
                {t("common.cancel")}
              </Button>
              <Button variant="outline" size="sm" className="border-warning text-warning hover:bg-warning/10" onClick={confirmDeselect}>
                {t("profile.confirmDeselect", "Yes, stop tracking")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <ConnectDeviceModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        metricName={selectedWearableParam || undefined}
      />
    </Card>
  );
}
