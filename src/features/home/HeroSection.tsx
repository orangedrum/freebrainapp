import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight, Rocket } from "lucide-react";
import type { OpenModalFn } from "@/types";
import { scrollToSection } from "@/lib/navigation";
import { EXTERNAL_LINKS } from "@/lib/constants";
import { GridBackground } from "@/components/shared/GridBackground";

interface HeroSectionProps {
  onOpenModal: OpenModalFn;
}

/** Hero section with headline, subheadline, and dual CTAs. */
export const HeroSection = ({ onOpenModal }: HeroSectionProps) => {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden py-20 md:py-32 lg:py-40 z-0">
      <GridBackground />
      <div className="container relative mx-auto px-4 md:px-6 text-center z-10">
        <div className="inline-flex items-center rounded-full border border-foreground bg-foreground/5 px-3 py-1 text-sm font-medium mb-8 text-foreground">
          {t("hero.presentedBy")}
        </div>
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-foreground">
          {t("hero.headlinePre")}{" "}
          <span className="text-brand-pink">{t("hero.headlineHighlight")}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
          {t("hero.subheadline")}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="w-full sm:w-auto bg-primary text-brand hover:bg-primary/90 border-0 h-12 px-8"
            onClick={() => scrollToSection("platform")}
          >
            {t("hero.learnMore")} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto h-12 px-8 border-foreground/20 text-foreground hover:bg-foreground/10"
            onClick={() =>
              onOpenModal(
                t("modal.joinPilot.title"),
                t("modal.joinPilot.description"),
                Rocket,
                t("modal.joinPilot.cta"),
                EXTERNAL_LINKS.pilotForm,
              )
            }
          >
            {t("hero.joinPilot")}
          </Button>
        </div>
      </div>
    </section>
  );
};
