import React, { useState, useEffect } from "react";
import { CheckCircle2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { InstallPromptCard } from "@/components/shared/InstallPromptCard";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { getFreeBrainScore } from "@/lib/scoreManager";
import { ScoreCountUp } from "./ScoreCountUp";
import type { CheckInPerspective } from "./CheckInFlow";

interface MysteryBoxRewardProps {
  mysteryBoxState: "hidden" | "spinning" | "revealed";
  pointsEarned: number;
  hasMultiplier: boolean;
  onClose: () => void;
  /** User email — needed for the install prompt (desktop "send to phone") */
  userEmail?: string;
  perspective?: CheckInPerspective;
  /** Score BEFORE this check-in (captured pre-write). When null, derived as
   *  live total − earned. */
  previousScore?: number | null;
  /** User whose total animates (patient in proxy mode, self otherwise) */
  scoreUserId?: string;
}

export const MysteryBoxReward: React.FC<MysteryBoxRewardProps> = ({
  mysteryBoxState,
  pointsEarned,
  hasMultiplier,
  onClose,
  userEmail,
  perspective = "self",
  previousScore = null,
  scoreUserId,
}) => {
  const { t } = useTranslation();
  const pwa = usePWAInstall();
  const pfx = perspective === "proxy" ? "proxy." : "";
  const [resolvedStart, setResolvedStart] = useState<number | null>(previousScore);

  // Fallback when no pre-write total was captured (e.g. revealed from a
  // loaded row): the live total already includes today's points.
  useEffect(() => {
    if (mysteryBoxState !== "revealed" || pointsEarned <= 0 || previousScore !== null) return;
    if (!scoreUserId) return;
    let cancelled = false;
    getFreeBrainScore(scoreUserId)
      .then((total) => {
        if (!cancelled) setResolvedStart(Math.max(0, total - pointsEarned));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mysteryBoxState, pointsEarned, previousScore, scoreUserId]);

  useEffect(() => {
    setResolvedStart(previousScore);
  }, [previousScore]);

  if (mysteryBoxState === "spinning") {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-6 py-20 animate-in fade-in zoom-in duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
          <div className="relative h-32 w-32 bg-primary text-primary-foreground rounded-full flex items-center justify-center animate-bounce">
            <Gift className="h-16 w-16" />
          </div>
        </div>
        <h3 className="text-3xl font-heading font-bold text-center">
          {t("checkin.mysteryBoxSpinning", "Spinning the Wheel of Joy...")}
        </h3>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center space-y-8 py-10 animate-in fade-in zoom-in duration-500 max-w-md mx-auto">
      <div className="text-center space-y-6">
        {pointsEarned > 0 ? (
          <>
            <div className="h-32 w-32 mx-auto bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-xl shadow-primary/30 transform transition-transform hover:scale-110">
              <span className="text-5xl font-bold">+{pointsEarned}</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-heading font-bold text-primary">
                {t("checkin.mysteryBoxTitle", "Reward Unlocked!")}
              </h3>
              <p className="text-xl text-muted-foreground">
                {t("checkin.mysteryBoxResult", { points: pointsEarned, defaultValue: `You earned ${pointsEarned} points!` })}
                {hasMultiplier && t("checkin.multiplierBonus", " (2x Cheer Bonus Applied!)")}
              </p>
              {resolvedStart !== null && (
                <p className="text-lg font-semibold text-foreground">
                  {t("checkin.totalScore", "Total score")}:{" "}
                  <ScoreCountUp from={resolvedStart} to={resolvedStart + pointsEarned} />
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="h-32 w-32 mx-auto bg-primary/20 text-primary rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-16 w-16" />
            </div>
            <h3 className="text-3xl font-heading font-bold text-primary">{t(`checkin.${pfx}completeTitle`, "Check-in Complete!")}</h3>
            <p className="text-xl text-muted-foreground">{t(`checkin.${pfx}completeDesc`, "Great job logging your status today.")}</p>
          </div>
        )}
      </div>
      <Button size="lg" className="h-16 w-full text-xl font-bold mt-8" onClick={onClose}>
        {t("checkin.finishCheckin", "Finish Check-in")}
      </Button>

      {/* ── PWA Install Prompt (post-check-in celebration) ── */}
      {!pwa.isInstalled && (
        <InstallPromptCard
          platform={pwa.platform}
          canInstall={pwa.canInstall}
          isInstalled={pwa.isInstalled}
          onPromptInstall={pwa.promptInstall}
          userEmail={userEmail || ""}
          onDismiss={() => pwa.markInstallShown()}
        />
      )}
    </div>
  );
};
