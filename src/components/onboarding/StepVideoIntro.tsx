import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, PlayCircle, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StepVideoIntroProps {
  onNext: () => void;
  speak: (text: string) => void;
}

export const StepVideoIntro: React.FC<StepVideoIntroProps> = ({ onNext, speak }) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const vidRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight">
          {t("onboarding.step12.title", "Watch a quick 1-minute intro")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
          onClick={() =>
            speak(
              `${t("onboarding.step12.title", "Watch a quick 1-minute intro")}. ${t(
                "onboarding.step12.followAlong",
                "Follow along with this short video."
              )}`
            )
          }
        >
          <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </Button>
      </div>

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

      <Button className="w-full h-16 md:h-20 text-xl md:text-2xl font-bold" onClick={onNext}>
        {t("onboarding.step12.watched", "I watched the video")}
      </Button>
    </div>
  );
};
