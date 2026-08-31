/**
 * BLStepMoveTogether — Step 6b (video step) of the BrainLover onboarding flow.
 *
 * Shows the follow-along exercise video. Preceded by BLStepMoveTogetherIntro.
 * "We did it!" advances; back returns to the intro step.
 */
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BLStepMoveTogetherProps {
  freeBrainerName: string;
  onNext: () => void;
  onBack: () => void;
  speak: (text: string) => void;
}

export const BLStepMoveTogether: React.FC<BLStepMoveTogetherProps> = ({
  freeBrainerName: _freeBrainerName,
  onNext,
  onBack,
  speak: _speak,
}) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const vidRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="aspect-[9/16] h-[60vh] md:h-[70vh] w-full max-w-sm mx-auto bg-slate-900 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden shadow-xl group">
        <video
          ref={vidRef}
          src="https://storage.googleapis.com/msgsndr/yblU9x5q5wszWmmHd5ey/media/ea396de7-c5af-40a7-9d92-3eb21e1f9dc9.mp4"
          className="w-full h-full object-cover"
          controls={isPlaying}
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        {!isPlaying && (
          <div
            className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer transition-all hover:bg-black/50"
            onClick={() => {
              if (vidRef.current) {
                vidRef.current.play();
                setIsPlaying(true);
              }
            }}
          >
            <PlayCircle className="w-24 h-24 text-white opacity-90 drop-shadow-lg group-hover:scale-110 transition-transform" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 md:gap-4">
        <Button className="w-full h-16 md:h-20 text-xl md:text-2xl font-bold" onClick={onNext}>
          {t("onboarding.bl.weMoved", "We did it!")}
        </Button>
        <Button variant="ghost" className="w-full h-12 text-lg" onClick={onBack}>
          {t("onboarding.back", "Back")}
        </Button>
      </div>
    </div>
  );
};
