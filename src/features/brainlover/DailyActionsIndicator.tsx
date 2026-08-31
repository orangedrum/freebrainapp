/**
 * DailyActionsIndicator — visual indicator showing which of the 3 daily
 * BrainLover actions have been used today: Encourage, Boost, Video Rec.
 *
 * Self-contained: reads localStorage keys directly and listens for the
 * `brainlover_interaction_sent` window event to refresh in real-time.
 *
 * Keys (all per-day):
 *   fb_encouraged_{patientId}_{date}       — cheer sent
 *   fb_boosted_{patientId}_{date}         — +50 boost used
 *   fb_video_recommended_{patientId}_{date} — video recommended
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ThumbsUp, Zap, Video } from "lucide-react";

interface DailyActionsIndicatorProps {
  patientId: string;
}

export function DailyActionsIndicator({ patientId }: DailyActionsIndicatorProps) {
  const { t } = useTranslation();
  const [encouraged, setEncouraged] = useState(false);
  const [boosted, setBoosted] = useState(false);
  const [videoRec, setVideoRec] = useState(false);

  const refresh = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    setEncouraged(!!localStorage.getItem(`fb_encouraged_${patientId}_${todayStr}`));
    setBoosted(!!localStorage.getItem(`fb_boosted_${patientId}_${todayStr}`));
    setVideoRec(!!localStorage.getItem(`fb_video_recommended_${patientId}_${todayStr}`));
  };

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("brainlover_interaction_sent", handler);
    return () => window.removeEventListener("brainlover_interaction_sent", handler);
  }, [patientId]);

  const items = [
    { icon: ThumbsUp, done: encouraged, label: t("dailyActions.encourage", "Encourage") },
    { icon: Zap, done: boosted, label: t("dailyActions.boost", "Boost") },
    { icon: Video, done: videoRec, label: t("dailyActions.video", "Video") },
  ];

  return (
    <div className="flex items-center gap-2">
      {items.map((item, i) => (
        <div
          key={i}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            item.done
              ? "bg-success/15 text-success border border-success/30"
              : "bg-muted/40 text-muted-foreground border border-border/50"
          }`}
        >
          <item.icon className={`h-3.5 w-3.5 ${item.done ? "fill-current" : ""}`} />
          <span>{item.label}</span>
          {item.done && (
            <svg className="h-3 w-3 text-success" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
