import { useTranslation } from "react-i18next";
import { NeuralPathways } from "./NeuralPathways";

/** Supporting Evidence section with overlaid heading and interactive neural pathways. */
export const SupportingEvidenceSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-12 md:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto relative">
          <div className="absolute top-8 md:top-12 left-0 right-0 text-center pointer-events-none z-10 px-4">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4 text-foreground drop-shadow-lg">
              {t("evidence.title")}
            </h2>
            <p className="text-base md:text-lg text-foreground/90 max-w-2xl mx-auto drop-shadow-md">
              {t("evidence.subtitle")}
            </p>
          </div>
          <NeuralPathways />
        </div>
      </div>
    </section>
  );
};
