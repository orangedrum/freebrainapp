/**
 * RaiseStandingModal — quick movement video to earn +50 points.
 *
 * Shows 3 quick videos, a VideoPlayer for the selected one, and
 * a "Claim +50 Points Boost" button that updates the score in Supabase.
 * Uses semantic tokens (primary for accents, success for completion).
 *
 * Props:
 *  - open: whether the modal is visible
 *  - onOpenChange: callback to toggle visibility
 *  - freeBrainScore: current score (used to compute new score)
 *  - userId: for the Supabase update
 *  - onBoostComplete: callback after score is updated (triggers leaderboard refresh)
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Zap, Play, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchPlaylistVideos, YouTubeVideo } from "@/lib/youtube";
import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { useToast } from "@/hooks/use-toast";
import { addFreeBrainPoints } from "@/lib/scoreManager";
import { postToWall } from "@/lib/postToWall";

export function RaiseStandingModal({
  open,
  onOpenChange,
  freeBrainScore,
  userId,
  onBoostComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  freeBrainScore: number;
  userId?: string;
  onBoostComplete: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [quickVideos, setQuickVideos] = useState<YouTubeVideo[]>([]);
  const [selectedVid, setSelectedVid] = useState<YouTubeVideo | null>(null);
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostCompleted, setBoostCompleted] = useState(false);

  useEffect(() => {
    if (open) loadQuickVideos();
  }, [open, userId]);

  const loadQuickVideos = async () => {
    try {
      const vids = await fetchPlaylistVideos();
      setQuickVideos(vids.slice(0, 3));
      if (vids.length > 0) setSelectedVid(vids[0]);
    } catch (e) {
      console.warn("Error loading quick boost videos:", e);
    }
  };

  const handleCompleteBoost = async () => {
    setIsBoosting(true);

    if (userId) {
      await addFreeBrainPoints(userId, 50);

      // ── Post raise standing activity to the Wall ──
      postToWall({
        userId,
        postedById: userId,
        authorName: "FreeBrainer",
        type: "raise_standing",
        content: `⚡ Raised their standing with a quick movement boost! +50 pts`,
      }).catch((e) => console.warn("[FB-DEBUG] postToWall raise standing failed:", e));
    }

    setTimeout(() => {
      setIsBoosting(false);
      setBoostCompleted(true);
      toast({
        title: t("scoreboard.boostToastTitle", "Standing Raised! ⚡ +50 Points"),
        description: t("scoreboard.boostToastDesc", "Your quick movement boost has increased your leaderboard rank!"),
      });

      onBoostComplete();

      setTimeout(() => {
        setBoostCompleted(false);
        onOpenChange(false);
      }, 1500);
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6 rounded-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Zap className="h-6 w-6 text-primary animate-bounce" />
            {t("scoreboard.raiseStandingTitle", "Raise Standing Incentive")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("scoreboard.raiseStandingDesc", "Complete a quick 2-3 minute movement video right now to earn +50 FreeBrain Points and climb higher on the leaderboards!")}
          </DialogDescription>
        </DialogHeader>

        {boostCompleted ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto animate-bounce" />
            <h4 className="font-bold text-lg text-foreground">{t("scoreboard.scoreBoosted", "Score Boosted! +50 Pts")}</h4>
            <p className="text-xs text-muted-foreground">{t("scoreboard.rankUpdated", "Rank updated on Individual & Team Leaderboards!")}</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">{t("scoreboard.pickBoostVideo", "Pick a quick boost video:")}</label>
              <div className="space-y-2">
                {quickVideos.map((vid) => {
                  const isSelected = selectedVid?.id === vid.id;
                  return (
                    <div
                      key={vid.id}
                      onClick={() => setSelectedVid(vid)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected ? "bg-primary/15 border-primary ring-2 ring-primary" : "bg-card border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="w-16 aspect-video rounded-lg overflow-hidden bg-muted shrink-0 relative flex items-center justify-center">
                        {vid.thumbnail ? (
                          <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover" />
                        ) : (
                          <Play className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">{vid.title}</div>
                        <p className="text-[10px] text-muted-foreground">{t("scoreboard.quickBoost", "Quick Boost")} • +50 {t("scoreboard.points", "Points")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedVid && (
              <QuickBoostPlayer videoId={selectedVid.id} onSwap={() => setSelectedVid(null)} />
            )}

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBoosting} className="text-xs">
                {t("scoreboard.cancel", "Cancel")}
              </Button>
              <Button
                onClick={handleCompleteBoost}
                disabled={isBoosting}
                className="text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Zap className="h-4 w-4" />
                {isBoosting ? t("scoreboard.claimingBoost", "Claiming Score Boost...") : t("scoreboard.claimBoost", "Claim +50 Points Boost")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── QuickBoostPlayer: uses reusable VideoPlayer with onError auto-swap ───
function QuickBoostPlayer({ videoId, onSwap }: { videoId: string; onSwap: () => void }) {
  return (
    <VideoPlayer
      videoId={videoId}
      onError={onSwap}
      showLike={false}
      showExpand={false}
      showControls
    />
  );
}
