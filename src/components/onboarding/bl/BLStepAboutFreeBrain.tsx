/**
 * BLStepAboutFreeBrain — Info step for INVITED BrainLovers.
 *
 * Shown when a BrainLover was invited by another BrainLover who already has
 * a FreeBrainer sub-account. The FreeBrainer is already linked via JoinTeam,
 * so this step replaces Management Mode + Connect FreeBrainer entirely.
 *
 * Shows the FreeBrainer's name/photo + a brief explanation of FreeBrain's
 * purpose + 3 ways to help (cheer, boost, move together).
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Volume2, ChevronRight, ArrowLeft, Heart, Zap, Users, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BLStepAboutFreeBrainProps {
  freeBrainerName: string;
  freeBrainerAvatar?: string | null;
  onNext: () => void;
  onBack: () => void;
  speak: (text: string) => void;
}

export const BLStepAboutFreeBrain: React.FC<BLStepAboutFreeBrainProps> = ({
  freeBrainerName,
  freeBrainerAvatar,
  onNext,
  onBack,
  speak,
}) => {
  const { t } = useTranslation();
  const name = freeBrainerName || t("onboarding.bl.yourFreeBrainer", "your FreeBrainer");

  const helpItems = [
    {
      icon: Heart,
      label: t("onboarding.bl.aboutHelpCheer", "Cheer them on"),
      desc: t("onboarding.bl.aboutHelpCheerDesc", "Send encouragement to keep them motivated."),
    },
    {
      icon: Zap,
      label: t("onboarding.bl.aboutHelpBoost", "Boost their score"),
      desc: t("onboarding.bl.aboutHelpBoostDesc", "Give point boosts to help them climb the leaderboard."),
    },
    {
      icon: Activity,
      label: t("onboarding.bl.aboutHelpMove", "Move together"),
      desc: t("onboarding.bl.aboutHelpMoveDesc", "Do movement videos side-by-side and check in together."),
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight">
          {t("onboarding.bl.aboutTitle", "What is FreeBrain?")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
          onClick={() =>
            speak(
              `${t("onboarding.bl.aboutTitle", "What is FreeBrain?")}. ${t(
                "onboarding.bl.aboutDesc",
                { name, defaultValue: `FreeBrain helps ${name} build a daily movement habit through short, fun exercise videos. Your support keeps them on track.` }
              )}`
            )
          }
        >
          <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </Button>
      </div>

      {/* FreeBrainer card */}
      <div className="flex items-center gap-4 bg-muted/30 rounded-2xl p-4 border-2">
        {freeBrainerAvatar ? (
          <img src={freeBrainerAvatar} alt={name} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Activity className="h-8 w-8 text-primary" />
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">{t("onboarding.bl.aboutYoureSupporting", "You're supporting")}</p>
          <p className="text-xl font-bold">{name}</p>
        </div>
      </div>

      <p className="text-lg md:text-xl text-muted-foreground">
        {t("onboarding.bl.aboutDesc", {
          name,
          defaultValue: `FreeBrain helps ${name} build a daily movement habit through short, fun exercise videos. Your support keeps them on track.`,
        })}
      </p>

      {/* 3 ways to help */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">
          {t("onboarding.bl.aboutHowToHelp", "Here's how you can help:")}
        </p>
        {helpItems.map((item, i) => (
          <div key={i} className="flex items-start gap-3 bg-muted/20 rounded-xl p-3 border">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:gap-4 pt-2">
        <Button className="w-full h-16 md:h-20 text-xl md:text-2xl" onClick={onNext}>
          {t("onboarding.bl.aboutContinue", "Let's get started")}
          <ChevronRight className="ml-2 h-6 w-6 md:h-8 md:w-8" />
        </Button>
        <Button variant="ghost" className="w-full h-12 text-lg" onClick={onBack}>
          <ArrowLeft className="mr-2 h-5 w-5" /> {t("onboarding.back", "Back")}
        </Button>
      </div>
    </div>
  );
};
