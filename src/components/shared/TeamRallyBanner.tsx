import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ShieldAlert, Megaphone, HeartHandshake, ChevronRight, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getActiveRalliesForUser, TeamRallyAlert } from "@/lib/teamRally";

interface TeamRallyBannerProps {
  userId?: string;
  teamId?: string | null;
  hasCheckedInToday?: boolean;
}

export function TeamRallyBanner({ userId, teamId, hasCheckedInToday }: TeamRallyBannerProps) {
  const { t } = useTranslation();
  const [activeRallies, setActiveRallies] = useState<TeamRallyAlert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    const loadRallies = () => {
      const rallies = getActiveRalliesForUser(userId, teamId);
      setActiveRallies(rallies);
    };

    loadRallies();

    const handleRallyEvent = () => loadRallies();
    window.addEventListener("team_rally_dispatched", handleRallyEvent);

    return () => {
      window.removeEventListener("team_rally_dispatched", handleRallyEvent);
    };
  }, [userId, teamId]);

  // Filter out dismissed ones
  const visibleRallies = activeRallies.filter((r) => !dismissedIds.includes(r.id));

  if (visibleRallies.length === 0) return null;

  const currentRally = visibleRallies[0];
  const isSos = currentRally.type === "sos";

  return (
    <Card className={`relative overflow-hidden border-2 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500 ${
      isSos
        ? "border-red-500 bg-red-500/10 dark:bg-red-950/20 ring-4 ring-red-500/30 animate-pulse"
        : "border-teal-500 bg-teal-500/10 dark:bg-teal-950/20 ring-2 ring-teal-500/20"
    }`}>
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`p-2.5 rounded-full shrink-0 ${
            isSos ? "bg-red-500 text-white animate-bounce" : "bg-teal-500 text-white"
          }`}>
            {isSos ? <ShieldAlert className="h-6 w-6" /> : <Megaphone className="h-6 w-6" />}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isSos ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30" : "bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30"
              }`}>
                {isSos ? t("rally.urgentSos", "🆘 Urgent SOS Support") : t("rally.teamRallyAlert", "🚀 Team Rally to Move!")}
              </span>
              {!hasCheckedInToday && (
                <span className="text-[10px] font-bold bg-background text-foreground px-2 py-0.5 rounded-full border border-border">
                  {t("rally.haventCheckedIn", "You Haven't Checked In Today")}
                </span>
              )}
            </div>
            <h4 className="font-extrabold text-sm sm:text-base text-foreground leading-snug">
              {t("rally.requestedBy", "{{name}} requested a team rally!", { name: currentRally.author_name })}
            </h4>
            <p className="text-xs text-muted-foreground italic line-clamp-2">
              "{currentRally.message}"
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-border/50">
          <Button asChild size="sm" className={`font-bold text-xs gap-1.5 shadow-md flex-1 sm:flex-initial ${
            isSos ? "bg-red-600 hover:bg-red-700 text-white" : "bg-teal-600 hover:bg-teal-700 text-white"
          }`}>
            <Link to="/community">
              <HeartHandshake className="h-4 w-4" /> {t("rally.rallyOnWall", "Rally Teammate on Wall")} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setDismissedIds((prev) => [...prev, currentRally.id])}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
