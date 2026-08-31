/**
 * BLStepHowYoullHelp — Second step for INVITED BrainLovers.
 *
 * "Here's How You'll Help" — 3 columns with icons:
 * 1. Sending movement videos
 * 2. Cheering them on
 * 3. Leaving notes and updates
 * CTA: "I'm In"
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Volume2, ChevronRight, ArrowLeft, Send, Heart, StickyNote, Video } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BLStepHowYoullHelpProps {
  onNext: () => void;
  onBack: () => void;
  speak: (text: string) => void;
}

export const BLStepHowYoullHelp: React.FC<BLStepHowYoullHelpProps> = ({
  onNext,
  onBack,
  speak,
}) => {
  const { t } = useTranslation();

  const helpItems = [
    {
      icon: Send,
      label: t("onboarding.bl.howHelpVideos", "Sending movement videos"),
      desc: t("onboarding.bl.howHelpVideosDesc", "Recommend exercises they can follow along with."),
    },
    {
      icon: Heart,
      label: t("onboarding.bl.howHelpCheer", "Cheering them on"),
      desc: t("onboarding.bl.howHelpCheerDesc", "Send encouragement to keep them motivated."),
    },
    {
      icon: StickyNote,
      label: t("onboarding.bl.howHelpNotes", "Leaving notes & updates"),
      desc: t("onboarding.bl.howHelpNotesDesc", "Log activities and share updates with other BrainLovers."),
    },
    {
      icon: Video,
      label: t("onboarding.bl.howHelpVirtual", "Move with them virtually"),
      desc: t("onboarding.bl.howHelpVirtualDesc", "Schedule and join live virtual movement sessions with our specialists."),
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight">
          {t("onboarding.bl.howYoullHelpTitle", "Here's How You'll Help")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
          onClick={() => speak(t("onboarding.bl.howYoullHelpTitle", "Here's How You'll Help"))}
        >
          <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </Button>
      </div>

      {/* 4-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {helpItems.map((item, i) => (
          <div
            key={i}
            className="flex flex-col items-center text-center gap-3 bg-muted/20 rounded-2xl p-5 border"
          >
            <div className="p-4 rounded-2xl bg-primary/10">
              <item.icon className="h-8 w-8 text-primary" />
            </div>
            <p className="font-bold text-base">{item.label}</p>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:gap-4 pt-2">
        <Button className="w-full h-16 md:h-20 text-xl md:text-2xl font-bold" onClick={onNext}>
          {t("onboarding.bl.imIn", "I'm In")}
          <ChevronRight className="ml-2 h-6 w-6 md:h-8 md:w-8" />
        </Button>
        <Button variant="ghost" className="w-full h-12 text-lg" onClick={onBack}>
          <ArrowLeft className="mr-2 h-5 w-5" /> {t("onboarding.back", "Back")}
        </Button>
      </div>
    </div>
  );
};
