import { useTranslation } from "react-i18next";
import { ExternalLink, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SocialFeed } from "@/types";

interface SocialFeedCardProps {
  feed: SocialFeed;
  index: number;
}

const feedKeys = ["instagram", "facebook", "tiktok"] as const;

/** Individual social media feed card with media, metrics, and caption. */
export const SocialFeedCard = ({ feed, index }: SocialFeedCardProps) => {
  const { t } = useTranslation();
  const Icon = feed.icon;
  const feedKey = feedKeys[index];
  const platformName = t(`socialFeeds.feeds.${feedKey}.platform`);
  const caption = t(`socialFeeds.feeds.${feedKey}.caption`);

  return (
    <div className="flex flex-col rounded-2xl bg-foreground/5 border border-foreground/10 overflow-hidden hover:bg-foreground/10 transition-colors group">
      <div className="p-4 flex items-center justify-between border-b border-foreground/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-foreground">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{platformName}</h3>
            <p className="text-xs text-muted-foreground">{feed.handle}</p>
          </div>
        </div>
        <a
          href={feed.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="relative aspect-square overflow-hidden bg-background/20">
        {feed.type === "video" && feed.video ? (
          <video
            src={feed.video}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img
            src={feed.image}
            alt={`${platformName} post`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
          <Button
            asChild
            variant="outline"
            className="w-full bg-foreground/20 border-foreground/30 text-foreground hover:bg-foreground/30 backdrop-blur-sm"
          >
            <a href={feed.link} target="_blank" rel="noopener noreferrer">
              {t("socialFeeds.viewOn", { platform: platformName })}
            </a>
          </Button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-4 text-foreground/80">
          <div className="flex items-center gap-1.5">
            <Heart className="h-4 w-4" />
            <span className="text-sm font-medium">{feed.likes}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{feed.comments}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">
          <span className="font-semibold text-foreground/90 mr-2">{feed.handle}</span>
          {caption}
        </p>
      </div>
    </div>
  );
};
