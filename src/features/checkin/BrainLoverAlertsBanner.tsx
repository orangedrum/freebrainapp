import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Video, Heart, X, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  fetchBrainLoverInteractions,
  dismissBrainLoverInteraction,
  BrainLoverInteraction,
} from "@/lib/brainloverInteractions";

interface BrainLoverAlertsBannerProps {
  userId?: string;
  onSelectRecommendedVideo?: (video: any) => void;
}

export function BrainLoverAlertsBanner({
  userId,
  onSelectRecommendedVideo,
}: BrainLoverAlertsBannerProps) {
  const { t } = useTranslation();
  const [interactions, setInteractions] = useState<BrainLoverInteraction[]>([]);

  useEffect(() => {
    if (!userId) return;

    loadInteractions();

    const handleInteractionSent = (e: any) => {
      if (e.detail) {
        setInteractions((prev) => [e.detail, ...prev.filter((i) => i.id !== e.detail.id)]);
      } else {
        loadInteractions();
      }
    };

    window.addEventListener("brainlover_interaction_sent", handleInteractionSent);
    return () => {
      window.removeEventListener("brainlover_interaction_sent", handleInteractionSent);
    };
  }, [userId]);

  const loadInteractions = async () => {
    if (!userId) return;
    const items = await fetchBrainLoverInteractions(userId);
    setInteractions(items.filter((i) => !i.dismissed));
  };

  const handleDismiss = (id: string, type: string) => {
    if (!userId) return;
    dismissBrainLoverInteraction(userId, id, type);
    setInteractions((prev) => prev.filter((i) => i.id !== id));
  };

  if (!userId || interactions.length === 0) return null;

  return (
    <div className="space-y-3">
      {interactions.map((act) => {
        if (act.type === "poke") {
          return (
            <Card
              key={act.id}
              className="border-2 border-warning bg-warning shadow-md animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Bell className="h-6 w-6 text-info shrink-0" />
                  <div>
                    <h4 className="font-bold text-blue-800 text-sm sm:text-base">
                      {t("alerts.pokeTitle", "Your BrainLover Reminded You to Move!")}
                    </h4>
                    <p className="text-xs text-blue-700/80">
                      {t("alerts.pokeMessage", { name: act.sender_name, defaultValue: "{{name}} sent a friendly reminder to get moving today!" })}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs font-semibold hover:bg-blue-700/10 text-blue-800 shrink-0"
                  onClick={() => handleDismiss(act.id, act.type)}
                >
                  <X className="h-4 w-4 mr-1" /> {t("alerts.dismiss", "Dismiss")}
                </Button>
              </CardContent>
            </Card>
          );
        }

        if (act.type === "recommend_video") {
          return (
            <Card
              key={act.id}
              className="border-2 border-primary bg-primary shadow-md animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="p-2.5 rounded-xl bg-primary-foreground/20 text-primary-foreground shrink-0">
                    <Video className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-primary-foreground text-sm sm:text-base">
                        {t("alerts.recommendTitle", { name: act.sender_name, defaultValue: "Video Recommended by {{name}}" })}
                      </h4>
                      <Badge variant="secondary" className="text-[10px]">
                        {t("alerts.recommended", "Recommended")}
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-primary-foreground/90 mt-0.5 line-clamp-1">
                      {act.video?.title || act.message}
                    </p>
                    {act.customMessage && (
                      <p className="text-xs text-primary-foreground/75 mt-1 italic line-clamp-2">
                        "{act.customMessage}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {act.video && onSelectRecommendedVideo && (
                    <Button
                      size="sm"
                      className="gap-2 font-bold text-xs bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                      onClick={() => {
                        onSelectRecommendedVideo(act.video);
                        handleDismiss(act.id, act.type);
                      }}
                    >
                      <Play className="h-3.5 w-3.5" /> {t("alerts.tryVideo", "Try This Video")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs font-semibold text-primary-foreground hover:bg-primary-foreground/10 shrink-0"
                    onClick={() => handleDismiss(act.id, act.type)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }

        if (act.type === "cheer") {
          return (
            <Card
              key={act.id}
              className="border-2 border-rose-400 bg-rose-400 shadow-md animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-700 shrink-0">
                    <Heart className="h-6 w-6 fill-rose-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-rose-900 text-sm sm:text-base">
                      {t("alerts.cheerTitle", "Your BrainLover Cheered for You!")}
                    </h4>
                    <p className="text-xs text-rose-800/80">
                      {t("alerts.cheerMessage", { name: act.sender_name, defaultValue: "{{name}} sent encouragement for your movement journey!" })}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs font-semibold text-rose-900 hover:bg-rose-500/20 shrink-0"
                  onClick={() => handleDismiss(act.id, act.type)}
                >
                  <X className="h-4 w-4 mr-1" /> {t("alerts.dismiss", "Dismiss")}
                </Button>
              </CardContent>
            </Card>
          );
        }

        return null;
      })}
    </div>
  );
}
