import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Activity, ThumbsUp, Zap, Video } from "lucide-react";
import { EncourageFlowModal } from "./EncourageFlowModal";

interface EncourageActionsProps {
  patientId: string;
  patientName: string;
  caregiverId: string;
  caregiverEmail?: string;
  hasCheckedInToday: boolean;
  hasEncouragedToday: boolean;
  hasBoostedToday: boolean;
  encouragementCount: number;
  onEncouragementCountChange: (count: number) => void;
  onHasEncouragedChange: (encouraged: boolean) => void;
  onHasBoostedChange: (boosted: boolean) => void;
  freeBrainScore?: number;
  onBoostComplete?: () => void;
  /** True if this FreeBrainer is a managed sub-account — hides "Remind" (no one to remind). */
  isManaged?: boolean;
  /** Called when the BrainLover taps "Check-in FreeBrainer" — opens check-in modal. */
  onCheckIn?: () => void;
}

/**
 * EncourageActions — the BrainLover's action area inside the status card.
 *
 * Top: "Check-in Your FreeBrainer" CTA (hidden when already checked in).
 * Divider + "Not with your FreeBrainer?" prompt.
 * Bottom: three secondary support actions — Send encouragement, Boost their points,
 * Recommend Video. Each opens the EncourageFlowModal in the appropriate mode.
 */
export function EncourageActions({
  patientId,
  patientName,
  caregiverId,
  caregiverEmail,
  hasCheckedInToday,
  hasEncouragedToday,
  hasBoostedToday,
  freeBrainScore,
  onBoostComplete,
  onHasEncouragedChange,
  onHasBoostedChange,
  onCheckIn,
}: EncourageActionsProps) {
  const { t } = useTranslation();
  const [modalMode, setModalMode] = useState<"remind" | "raiseStanding" | null>(null);

  const firstName = patientName.split(" ")[0];

  const handleEncourage = () => {
    setModalMode("remind");
    onHasEncouragedChange(true);
  };

  const handleBoost = () => {
    setModalMode("raiseStanding");
    onHasBoostedChange(true);
  };

  const handleRecommendVideo = () => {
    setModalMode("remind");
  };

  return (
    <div className="w-full space-y-3">
      {/* Check-in CTA — only when not yet checked in */}
      {!hasCheckedInToday && (
        <Button
          onClick={() => onCheckIn?.()}
          className="gap-2 bg-warning hover:bg-warning/90 text-white shadow-md font-bold w-full sm:w-auto"
        >
          <Activity className="h-4 w-4" />
          {t("caregiverDashboard.checkInYourFreeBrainer", "Check-in Your FreeBrainer")}
        </Button>
      )}

      <Separator className="my-1" />

      {/* Remote support section */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">
          {t("encourageActions.notWithPrompt", "Not with your FreeBrainer, {{name}}? You can still support them by:", { name: firstName })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={handleEncourage}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            {t("encourageActions.sendEncouragement", "Send encouragement")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={handleBoost}
          >
            <Zap className="h-3.5 w-3.5" />
            {t("encourageActions.boostPoints", "Boost their points")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={handleRecommendVideo}
          >
            <Video className="h-3.5 w-3.5" />
            {t("encourageActions.recommendVideo", "Recommend Video")}
          </Button>
        </div>
      </div>

      {/* Encourage flow modal */}
      {modalMode && (
        <EncourageFlowModal
          isOpen={!!modalMode}
          onClose={() => setModalMode(null)}
          mode={modalMode}
          patientId={patientId}
          patientName={patientName}
          caregiverId={caregiverId}
          caregiverEmail={caregiverEmail}
          freeBrainScore={freeBrainScore}
          onBoostComplete={onBoostComplete}
        />
      )}
    </div>
  );
}
