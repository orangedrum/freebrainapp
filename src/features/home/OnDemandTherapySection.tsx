import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ChevronRight, Rocket } from "lucide-react";
import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { Pill } from "@/components/shared/Pill";
import { VIDEO_SOURCES, EXTERNAL_LINKS } from "@/lib/constants";
import type { OpenModalFn } from "@/types";

interface OnDemandTherapySectionProps {
  onOpenModal: OpenModalFn;
}

/** Feature zigzag section showcasing on-demand therapy with video. */
export const OnDemandTherapySection = ({ onOpenModal }: OnDemandTherapySectionProps) => {
  const { t } = useTranslation();

  const therapyFeatures = [
    t("onDemand.features.access"),
    t("onDemand.features.customized"),
    t("onDemand.features.habitForming"),
  ];

  return (
    <div className="grid md:grid-cols-[minmax(250px,320px)_1fr] gap-12 lg:gap-20 items-center mb-20 md:mb-32">
      <div className="order-2 md:order-1">
        <VideoPlayer
          src={VIDEO_SOURCES.onDemand.src}
          poster={VIDEO_SOURCES.onDemand.poster}
          rotationClass="transform -rotate-3"
        />
      </div>
      <div className="order-1 md:order-2 space-y-6">
        <Pill>{t("onDemand.pill")}</Pill>
        <h3 className="text-3xl font-bold text-foreground">{t("onDemand.title")}</h3>
        <p className="text-lg text-muted-foreground">
          {t("onDemand.description")}
        </p>
        <ul className="space-y-3">
          {therapyFeatures.map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-muted-foreground">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/10 text-foreground">
                <ChevronRight className="h-4 w-4" />
              </div>
              {item}
            </li>
          ))}
        </ul>
        <div className="pt-2">
          <Button
            className="bg-primary text-brand hover:bg-primary/90 border-0"
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
            {t("onDemand.joinPilot")}
          </Button>
        </div>
      </div>
    </div>
  );
};
