/**
 * BLStepManagementMode — Step 3 of the BrainLover onboarding flow.
 *
 * "Will you manage your FreeBrainer's account, or will they be independent?"
 * Two big choice cards. NOT skippable.
 *
 * @param managementMode / setManagementMode — 'manage' | 'independent' | null
 * @param onNext / onBack
 * @param speak
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Volume2, ChevronRight, ArrowLeft, Monitor, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";

export type ManagementMode = "manage" | "independent";

interface BLStepManagementModeProps {
  managementMode: ManagementMode | null;
  setManagementMode: (mode: ManagementMode) => void;
  onNext: () => void;
  onBack: () => void;
  speak: (text: string) => void;
}

export const BLStepManagementMode: React.FC<BLStepManagementModeProps> = ({
  managementMode,
  setManagementMode,
  onNext,
  onBack,
  speak,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight">
          {t("onboarding.bl.managementTitle", "How will you support them?")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
          onClick={() =>
            speak(
              `${t("onboarding.bl.managementTitle", "How will you support them?")}. ${t(
                "onboarding.bl.managementDesc",
                "Will you run their account for them, or will they use their own phone?"
              )}`
            )
          }
        >
          <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </Button>
      </div>

      <p className="text-lg md:text-xl text-muted-foreground">
        {t(
          "onboarding.bl.managementDesc",
          "Will you run their account for them, or will they use their own phone?"
        )}
      </p>

      <div className="space-y-4">
        {/* Manage */}
        <Button
          variant={managementMode === "manage" ? "default" : "outline"}
          className="w-full h-auto p-4 md:p-6 text-xl justify-start border-2 whitespace-normal text-left"
          onClick={() => setManagementMode("manage")}
        >
          <Monitor
            className={`h-8 w-8 md:h-10 md:w-10 mr-4 shrink-0 ${
              managementMode === "manage" ? "text-primary-foreground" : "text-primary"
            }`}
          />
          <div>
            <div className="font-bold text-[clamp(1.25rem,3vw,1.5rem)]">
              {t("onboarding.bl.manageOption", "I'll manage their account")}
            </div>
            <div
              className={`text-base md:text-lg font-normal mt-1 ${
                managementMode === "manage" ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}
            >
              {t(
                "onboarding.bl.manageDesc",
                "They don't have a phone or need help. You'll run things for them."
              )}
            </div>
          </div>
        </Button>

        {/* Independent */}
        <Button
          variant={managementMode === "independent" ? "default" : "outline"}
          className="w-full h-auto p-4 md:p-6 text-xl justify-start border-2 whitespace-normal text-left"
          onClick={() => setManagementMode("independent")}
        >
          <Smartphone
            className={`h-8 w-8 md:h-10 md:w-10 mr-4 shrink-0 ${
              managementMode === "independent" ? "text-primary-foreground" : "text-primary"
            }`}
          />
          <div>
            <div className="font-bold text-[clamp(1.25rem,3vw,1.5rem)]">
              {t("onboarding.bl.independentOption", "They'll run their own account")}
            </div>
            <div
              className={`text-base md:text-lg font-normal mt-1 ${
                managementMode === "independent"
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground"
              }`}
            >
              {t(
                "onboarding.bl.independentDesc",
                "They have their own phone and can check in themselves."
              )}
            </div>
          </div>
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:gap-4 pt-2">
        <Button
          className="w-full h-16 md:h-20 text-xl md:text-2xl"
          disabled={!managementMode}
          onClick={onNext}
        >
          {t("onboarding.continue", "Continue")}
          <ChevronRight className="ml-2 h-6 w-6 md:h-8 md:w-8" />
        </Button>
        <Button variant="ghost" className="w-full h-12 text-lg" onClick={onBack}>
          <ArrowLeft className="mr-2 h-5 w-5" /> {t("onboarding.back", "Back")}
        </Button>
      </div>
    </div>
  );
};
