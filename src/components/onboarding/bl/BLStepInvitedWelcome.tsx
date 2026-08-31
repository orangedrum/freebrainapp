/**
 * BLStepInvitedWelcome — First step for INVITED BrainLovers.
 *
 * "Come Love Their Brain" — mimics the "Is this your FreeBrainer?" layout
 * with the associated FreeBrainer's profile picture and name.
 * Shows who invited them: "You were invited by [FB]'s BrainLover [Inviter Name]".
 * CTA: "That's Them"
 */
import React from "react";
import { Button } from "@/components/ui/button";
import { Volume2, ChevronRight, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getAvatarUrl } from "@/lib/avatar";

interface BLStepInvitedWelcomeProps {
  freeBrainerName: string;
  freeBrainerAvatar?: string | null;
  inviterName?: string | null;
  onNext: () => void;
  speak: (text: string) => void;
}

export const BLStepInvitedWelcome: React.FC<BLStepInvitedWelcomeProps> = ({
  freeBrainerName,
  freeBrainerAvatar,
  inviterName,
  onNext,
  speak,
}) => {
  const { t } = useTranslation();
  const name = freeBrainerName || t("onboarding.bl.yourFreeBrainer", "your FreeBrainer");

  const inviteText = inviterName
    ? t("onboarding.bl.invitedBy", {
        name,
        inviter: inviterName,
        defaultValue: `You were invited to support ${name} from ${inviterName}`,
      })
    : t("onboarding.bl.invitedGeneric", {
        name,
        defaultValue: `You were invited to support ${name}`,
      });

  console.log("[FB-DEBUG] BLStepInvitedWelcome render:", { freeBrainerName, inviterName, freeBrainerAvatar, inviteText });

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight text-center w-full">
          {t("onboarding.bl.invitedWelcomeTitle", "Come Love Their Brain")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20 absolute top-0 right-0"
          onClick={() => speak(`${t("onboarding.bl.invitedWelcomeTitle", "Come Love Their Brain")}. ${inviteText}`)}
        >
          <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </Button>
      </div>

      {/* FreeBrainer card — "Is this your FreeBrainer?" layout */}
      <div className="flex flex-col items-center gap-4 py-6">
        <img
          src={freeBrainerAvatar || getAvatarUrl(name)}
          alt={name}
          className="h-28 w-28 rounded-full object-cover border-4 border-primary/20 shadow-lg bg-primary/10"
        />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {t("onboarding.bl.isThisYourFreeBrainer", "Is this your FreeBrainer?")}
          </p>
          <p className="text-2xl font-bold mt-1">{name}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 bg-muted/30 rounded-xl p-4 border">
        <Heart className="h-5 w-5 text-primary shrink-0" />
        <p className="text-base md:text-lg text-muted-foreground text-center">{inviteText}</p>
      </div>

      <Button className="w-full h-16 md:h-20 text-xl md:text-2xl font-bold" onClick={onNext}>
        {t("onboarding.bl.thatsThem", "That's Them")}
        <ChevronRight className="ml-2 h-6 w-6 md:h-8 md:w-8" />
      </Button>
    </div>
  );
};
