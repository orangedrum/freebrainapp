import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Brain, Handshake, Banknote } from "lucide-react";
import type { GetInvolvedCard, OpenModalFn } from "@/types";
import { scrollToSection } from "@/lib/navigation";
import { EXTERNAL_LINKS } from "@/lib/constants";
import { GridBackground } from "@/components/shared/GridBackground";

interface GetInvolvedSectionProps {
  onOpenModal: OpenModalFn;
}

/** "Get Involved" section with 3 centered cards on grid background. */
export const GetInvolvedSection = ({ onOpenModal }: GetInvolvedSectionProps) => {
  const { t } = useTranslation();

  const involvedCards: GetInvolvedCard[] = [
    {
      icon: Brain,
      title: t("getInvolved.cards.freeBrainers.title"),
      description: t("getInvolved.cards.freeBrainers.description"),
      ctaText: t("getInvolved.cards.freeBrainers.cta"),
    },
    {
      icon: Handshake,
      title: t("getInvolved.cards.advisors.title"),
      description: t("getInvolved.cards.advisors.description"),
      ctaText: t("getInvolved.cards.advisors.cta"),
    },
    {
      icon: Banknote,
      title: t("getInvolved.cards.funding.title"),
      description: t("getInvolved.cards.funding.description"),
      ctaText: t("getInvolved.cards.funding.cta"),
    },
  ];

  const freeBrainersTitle = t("getInvolved.cards.freeBrainers.title");
  const advisorsTitle = t("getInvolved.cards.advisors.title");

  return (
    <section
      id="get-involved"
      className="relative overflow-hidden py-20 md:py-32 border-t border-foreground/10"
    >
      <GridBackground lineOpacity={0.12} glowOpacity={0.1} />

      <div className="container relative mx-auto px-4 md:px-6">
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
            {t("getInvolved.title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("getInvolved.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {involvedCards.map((card, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center gap-4 rounded-2xl bg-brand border border-foreground/20 p-8 hover:bg-brand-hover transition-colors shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/15 text-foreground mb-2">
                <card.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">{card.title}</h3>
              <p className="text-foreground/75 flex-1">{card.description}</p>
              <Button
                className="w-full bg-primary text-brand hover:bg-primary/90 mt-4 border-0"
                onClick={() => {
                  if (card.title === freeBrainersTitle) {
                    scrollToSection("growth-discovery");
                    return;
                  }
                  if (card.title === advisorsTitle) {
                    onOpenModal(
                      t("modal.advisors.title"),
                      t("modal.advisors.description"),
                      card.icon,
                      t("modal.advisors.cta"),
                      EXTERNAL_LINKS.calendly,
                    );
                    return;
                  }
                  onOpenModal(
                    t("modal.funding.title"),
                    t("modal.funding.description"),
                    card.icon,
                    t("modal.funding.cta"),
                    EXTERNAL_LINKS.calendly,
                  );
                }}
              >
                {card.ctaText}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
