import { useTranslation } from "react-i18next";
import { socialFeeds } from "@/lib/constants";
import { SocialFeedCard } from "./SocialFeedCard";
import { GridBackground } from "@/components/shared/GridBackground";

/** "Follow Us" section displaying social media feed cards in a grid. */
export const SocialFeedsSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 md:py-32 border-t border-foreground/10 relative overflow-hidden">
      <GridBackground lineOpacity={0.1} glowOpacity={0} />

      <div className="container relative mx-auto px-4 md:px-6 z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
            {t("socialFeeds.title")}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {socialFeeds.map((feed, index) => (
            <SocialFeedCard key={index} feed={feed} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
