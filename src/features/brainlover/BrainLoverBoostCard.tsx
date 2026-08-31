/**
 * BrainLoverBoostCard — shows the FreeBrainer's FreeBrain score and
 * a daily "Boost" button that gives +50 points (1/day limit).
 *
 * Reuses the same localStorage tracking as EncourageActions:
 *   fb_boosted_{patientId}_{date} — "1" when boosted today
 *   fb_score_{patientId}          — current score (mock / local override)
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Star, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addFreeBrainPoints } from "@/lib/scoreManager";
import { postToWall } from "@/lib/postToWall";

interface BrainLoverBoostCardProps {
  patientId: string;
  patientName: string;
  freeBrainScore: number;
  hasBoostedToday: boolean;
  onBoost: () => void;
}

export function BrainLoverBoostCard({
  patientId,
  patientName,
  freeBrainScore,
  hasBoostedToday,
  onBoost,
}: BrainLoverBoostCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [animating, setAnimating] = useState(false);
  const firstName = patientName.split(" ")[0];

  const handleBoost = async () => {
    if (hasBoostedToday) return;
    const todayStr = new Date().toISOString().split("T")[0];
    setAnimating(true);
    localStorage.setItem(`fb_boosted_${patientId}_${todayStr}`, "1");
    await addFreeBrainPoints(patientId, 50);

    // ── Post boost activity to the Wall ──
    postToWall({
      userId: patientId,
      postedById: patientId,
      authorName: patientName,
      type: "boost",
      content: `⚡ ${patientName} received a +50 point boost from their BrainLover!`,
    }).catch((e) => console.warn("[FB-DEBUG] postToWall boost failed:", e));

    onBoost();
    setTimeout(() => setAnimating(false), 800);
    toast({
      title: t("loveTheirBrain.boostSentTitle", "Points Boosted! ⚡ +50"),
      description: t("loveTheirBrain.boostSentDesc", "{{name}} earned +50 FreeBrain Points!", { name: firstName }),
    });
  };

  return (
    <Card className="border-primary/30 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Star className="h-5 w-5 text-gold" />
          {t("loveTheirBrain.freeBrainScore", "FreeBrain Score")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-foreground">{freeBrainScore}</span>
          <span className="text-sm text-muted-foreground">{t("loveTheirBrain.points", "points")}</span>
        </div>

        <Button
          onClick={handleBoost}
          disabled={hasBoostedToday}
          className={`w-full gap-2 font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-transform ${
            animating ? "scale-105" : "scale-100"
          } ${hasBoostedToday ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Zap className={`h-4 w-4 transition-transform ${animating ? "scale-125" : ""}`} />
          {hasBoostedToday
            ? t("loveTheirBrain.alreadyBoosted", "Boosted Today ✓")
            : t("loveTheirBrain.boostPoints", "Boost +50 Points")}
        </Button>

        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-info" />
          <span>
            {t("loveTheirBrain.boostExplanation", "You can boost once per day. Each boost gives {{name}} +50 FreeBrain Points to help them climb the leaderboard and stay motivated.", { name: firstName })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
