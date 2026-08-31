import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RefreshCw } from "lucide-react";

interface CheckInTimeStepProps {
  suggestedVideo: any;
  onSwapVideo: (maxDurationSeconds?: number) => void;
  onSelectOwn: () => void;
  onSelectTime: (minutes: number) => void;
  onBack: () => void;
  /** Override the primary button label (e.g. "Let's Move Again!") */
  primaryLabel?: string;
  /** Hide the secondary "Already moved" button (e.g. joint check-in) */
  hideSecondary?: boolean;
  /** Optional banner rendered above the action buttons */
  banner?: React.ReactNode;
}

const MIN_MINUTES = 5;
const MAX_MINUTES = 75;
const STEP_MINUTES = 5;

export const CheckInTimeStep: React.FC<CheckInTimeStepProps> = ({
  suggestedVideo,
  onSwapVideo,
  onSelectOwn,
  onSelectTime,
  onBack,
  primaryLabel,
  hideSecondary = false,
  banner,
}) => {
  const { t } = useTranslation();
  const [selectedTime, setSelectedTime] = useState<number>(15);

  const videoDuration = suggestedVideo?.durationSeconds
    ? Math.ceil(suggestedVideo.durationSeconds / 60)
    : null;

  const formatTime = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins} ${t("checkin.min", "min")}`;
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
      {/* Slider */}
      <div className="max-w-lg mx-auto space-y-3 px-4">
        <div className="text-center">
          <span className="text-4xl font-bold text-primary">{formatTime(selectedTime)}</span>
        </div>
        <Slider
          value={[selectedTime]}
          min={MIN_MINUTES}
          max={MAX_MINUTES}
          step={STEP_MINUTES}
          onValueChange={(vals) => setSelectedTime(vals[0])}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>{formatTime(MIN_MINUTES)}</span>
          <span>{formatTime(MAX_MINUTES)}</span>
        </div>
      </div>

      {/* Video preview — 50% smaller. Always show (loading state if no video yet) */}
      <div className="max-w-[200px] mx-auto space-y-2">
        <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative shadow-lg border-2 border-primary/20">
          {suggestedVideo?.thumbnail ? (
            <img
              src={suggestedVideo.thumbnail}
              alt={suggestedVideo.title}
              className="w-full h-full object-cover"
            />
          ) : suggestedVideo?.id ? (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground text-sm">
              {t("checkin.loadingVideo", "Loading video...")}
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground text-sm">
              {t("checkin.loadingVideo", "Loading video...")}
            </div>
          )}
          {videoDuration && (
            <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
              {videoDuration} {t("checkin.min", "min")}
            </span>
          )}
        </div>
        {suggestedVideo?.title && (
          <p className="font-semibold text-xs truncate text-center">{suggestedVideo.title}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSwapVideo(selectedTime * 60)}
          className="gap-1.5 border-2 border-white text-sm font-bold w-full"
        >
          <RefreshCw className="h-4 w-4" />
          {t("checkin.swapVideo", "Swap Video")}
        </Button>
      </div>

      {/* Optional banner (e.g. "[Name] already moved today!") */}
      {banner && <div className="max-w-lg mx-auto">{banner}</div>}

      {/* Actions — primary & secondary on one line, text link below */}
      <div className="space-y-2 pt-1">
        <div className="flex gap-2 max-w-lg mx-auto">
          <Button
            size="lg"
            className="flex-1 h-14 text-base font-bold"
            onClick={() => onSelectTime(selectedTime)}
          >
            {primaryLabel ?? t("checkin.startMoving", "Start Moving")}
          </Button>
          {!hideSecondary && (
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-14 text-sm font-semibold"
              onClick={onSelectOwn}
            >
              {t("checkin.alreadyMoved", "Already moved")}
            </Button>
          )}
        </div>
        <div className="text-center">
          <Button variant="ghost" onClick={onBack} className="text-sm">
            {t("checkin.goBack", "Go Back")}
          </Button>
        </div>
      </div>

    </div>
  );
};
