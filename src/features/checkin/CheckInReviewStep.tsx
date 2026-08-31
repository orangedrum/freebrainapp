import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { CheckinStatus } from "./useCheckInData";
import type { CheckInPerspective } from "./CheckInFlow";

interface CheckInReviewStepProps {
  checkinStatus: CheckinStatus;
  videoChoice: "followed" | "own" | "both" | null;
  userSymptoms: string[];
  symptomLevels: Record<string, number>;
  isLoading: boolean;
  onBack: () => void;
  onSubmit: (e?: React.FormEvent) => void;
  perspective?: CheckInPerspective;
}

export const CheckInReviewStep: React.FC<CheckInReviewStepProps> = ({
  checkinStatus,
  videoChoice,
  userSymptoms,
  symptomLevels,
  isLoading,
  onBack,
  onSubmit,
  perspective = "self",
}) => {
  const { t } = useTranslation();
  const pfx = perspective === "proxy" ? "proxy." : "";

  return (
    <form onSubmit={onSubmit} className="space-y-8 animate-in fade-in slide-in-from-right-4">
      <div className="max-w-2xl mx-auto bg-muted/30 p-6 rounded-2xl border-2">
        <h4 className="font-bold text-xl mb-4">{t("checkin.summary", "Summary")}</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-muted-foreground">{t("checkin.statusLabel", "Status")}</span>
            <span className="font-bold capitalize">{checkinStatus?.replace("_", " ")}</span>
          </div>
          {checkinStatus === "moved" && (
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">{t("checkin.activityLabel", "Activity")}</span>
              <span className="font-bold capitalize">
                {videoChoice === "followed"
                  ? t("checkin.followedVideo", "Followed Video")
                  : videoChoice === "both"
                    ? t("checkin.bothVideoOwn", "Both (Video & Own)")
                    : t("checkin.ownMovement", "Own Movement")}
              </span>
            </div>
          )}
          <div className="flex justify-between items-start pt-2">
            <span className="text-muted-foreground">{t("checkin.symptomsLabel", "Symptoms")}</span>
            <div className="text-right">
              {userSymptoms.map((s) => (
                <div key={s} className="text-sm">
                  <span className="font-medium">{s}:</span> {symptomLevels[s] ?? 0}/10
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
        <Button type="button" variant="ghost" className="h-14" onClick={onBack}>
          {t("checkin.goBack", "Go Back")}
        </Button>
        <Button type="submit" size="lg" className="h-14 min-w-[200px] font-bold text-lg" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("common.loading")}
            </>
          ) : (
            t(`checkin.${pfx}freedMyBrain`, "I Moved Today!")
          )}
        </Button>
      </div>
    </form>
  );
};
