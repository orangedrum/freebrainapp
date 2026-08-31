import { useTranslation } from "react-i18next";
import { ChevronRight, Home, Brain, Rocket, Building2 } from "lucide-react";
import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { Pill } from "@/components/shared/Pill";
import { VIDEO_SOURCES, EXTERNAL_LINKS } from "@/lib/constants";
import { openExternalLink } from "@/lib/navigation";
import type { GrowthCard, OpenModalFn } from "@/types";

interface BecomeFreeBrainerSectionProps {
  onOpenModal: OpenModalFn;
}

/** Feature zigzag section with 4 growth cards and video. */
export const BecomeFreeBrainerSection = ({ onOpenModal }: BecomeFreeBrainerSectionProps) => {
  const { t } = useTranslation();

  const growthCards: GrowthCard[] = [
    {
      icon: Home,
      title: t("becomeFreeBrainer.cards.joinCommunity.title"),
      description: t("becomeFreeBrainer.cards.joinCommunity.description"),
      cta: t("becomeFreeBrainer.cards.joinCommunity.cta"),
    },
    {
      icon: Brain,
      title: t("becomeFreeBrainer.cards.bePartOfResearch.title"),
      description: t("becomeFreeBrainer.cards.bePartOfResearch.description"),
      cta: t("becomeFreeBrainer.cards.bePartOfResearch.cta"),
    },
    {
      icon: Rocket,
      title: t("becomeFreeBrainer.cards.appPilot.title"),
      description: t("becomeFreeBrainer.cards.appPilot.description"),
      cta: t("becomeFreeBrainer.cards.appPilot.cta"),
    },
    {
      icon: Building2,
      title: t("becomeFreeBrainer.cards.careFacilities.title"),
      description: t("becomeFreeBrainer.cards.careFacilities.description"),
      cta: t("becomeFreeBrainer.cards.careFacilities.cta"),
    },
  ];

  const handleCardClick = (card: GrowthCard): void => {
    const joinCommunityTitle = t("becomeFreeBrainer.cards.joinCommunity.title");
    const appPilotTitle = t("becomeFreeBrainer.cards.appPilot.title");
    const careFacilitiesTitle = t("becomeFreeBrainer.cards.careFacilities.title");

    if (card.title === joinCommunityTitle) {
      openExternalLink(EXTERNAL_LINKS.whatsapp);
      return;
    }

    if (card.title === appPilotTitle) {
      onOpenModal(
        t("modal.joinPilot.title"),
        t("modal.joinPilot.description"),
        card.icon,
        t("modal.joinPilot.cta"),
        EXTERNAL_LINKS.pilotForm,
      );
      return;
    }

    if (card.title === careFacilitiesTitle) {
      onOpenModal(
        card.cta,
        t("modal.careFacilities.description"),
        card.icon,
        t("modal.careFacilities.cta"),
        EXTERNAL_LINKS.calendly,
      );
      return;
    }

    onOpenModal(
      t("modal.designYourApp.title"),
      t("modal.designYourApp.description"),
      card.icon,
      t("modal.designYourApp.cta"),
      EXTERNAL_LINKS.calendly,
    );
  };

  return (
    <div id="growth-discovery" className="grid md:grid-cols-[1fr_minmax(250px,320px)] gap-12 lg:gap-20 items-center">
      <div className="space-y-6">
        <Pill>{t("becomeFreeBrainer.pill")}</Pill>
        <h3 className="text-3xl font-bold text-foreground">{t("becomeFreeBrainer.title")}</h3>
        <p className="text-lg text-muted-foreground">
          {t("becomeFreeBrainer.description")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {growthCards.map((card, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-2xl bg-secondary border border-foreground/10 p-4 hover:bg-secondary/80 transition-colors group cursor-pointer"
              onClick={() => handleCardClick(card)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/10 text-foreground">
                <card.icon className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">{card.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                {card.description}
              </p>
              <div className="text-xs font-medium text-foreground group-hover:text-foreground/80 flex items-center gap-1 transition-colors mt-1">
                {card.cta} <ChevronRight className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <VideoPlayer
        src={VIDEO_SOURCES.becomeFreeBrainer.src}
        poster={VIDEO_SOURCES.becomeFreeBrainer.poster}
        rotationClass="transform rotate-3"
      />
    </div>
  );
};
