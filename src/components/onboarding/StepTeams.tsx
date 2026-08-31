import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { OPEN_TEAMS } from "./constants";
import { Users, ChevronRight, Search, Loader2, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";

interface StepTeamsProps {
  teamCode: string;
  setTeamCode: (val: string) => void;
  teamSearchQuery: string;
  setTeamSearchQuery: (val: string) => void;
  selectedTeam: string;
  setSelectedTeam: (val: string) => void;
  onNext: () => void;
  onSkip: () => void;
  speak?: (text: string) => void;
}

export const StepTeams: React.FC<StepTeamsProps> = ({
  teamCode,
  setTeamCode,
  teamSearchQuery,
  setTeamSearchQuery,
  selectedTeam,
  setSelectedTeam,
  onNext,
  onSkip,
  speak,
}) => {
  const { t } = useTranslation();
  const [dbTeams, setDbTeams] = useState<Array<{ id: string; name: string; conditions: string[]; code?: string; slogan?: string | null; image_url?: string | null }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("teams")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          const formatted = data.map((t: any) => ({
            id: t.id,
            name: t.name,
            code: t.code,
            slogan: t.slogan,
            image_url: t.image_url,
            conditions: t.conditions && Array.isArray(t.conditions) ? t.conditions : ["Open Team"]
          }));

          const existingIds = new Set(formatted.map(t => t.id));
          const merged = [
            ...formatted,
            ...OPEN_TEAMS.filter(ot => !existingIds.has(ot.id))
          ];
          setDbTeams(merged);
        } else {
          setDbTeams(OPEN_TEAMS);
        }
      } catch (err) {
        setDbTeams(OPEN_TEAMS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const filteredTeams = dbTeams.filter((team) => {
    if (!teamSearchQuery.trim()) return true;
    const q = teamSearchQuery.toLowerCase();
    return team.name.toLowerCase().includes(q) || team.conditions.some((c) => c.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{t("onboarding.step9.title", "Join a Team")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("onboarding.step9.subtitle", "Connect with an open community team or enter a private team code.")}
          </p>
        </div>
        {speak && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={() =>
              speak(
                `${t("onboarding.step9.title")}. ${t("onboarding.step9.subtitle")}`
              )
            }
          >
            <Volume2 className="h-5 w-5 text-primary" />
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold">{t("onboarding.step9.teamCode", "Have a Team Code?")}</label>
          <Input
            placeholder={t("onboarding.step9.codePlaceholder", "Enter 6-digit code or Team ID...")}
            className="h-12 border-2 uppercase tracking-wider font-mono"
            value={teamCode}
            onChange={(e) => {
              setTeamCode(e.target.value);
              if (e.target.value.trim()) setSelectedTeam("");
            }}
          />
        </div>

        <div className="space-y-2 pt-2">
          <label className="text-sm font-semibold">{t("onboarding.step9.openTeam", "Or Join an Open Team")}</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams by name or condition..."
              className="h-10 pl-9 border-2"
              value={teamSearchQuery}
              onChange={(e) => setTeamSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 pt-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading teams...
              </div>
            ) : filteredTeams.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 text-sm">No matching teams found.</p>
            ) : (
              filteredTeams.map((team) => (
                <Card
                  key={team.id}
                  className={`cursor-pointer transition-colors border-2 ${
                    selectedTeam === team.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                  }`}
                  onClick={() => {
                    setSelectedTeam(team.id);
                    setTeamCode("");
                  }}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {team.image_url ? (
                          <img src={team.image_url} alt={team.name} className="h-full w-full object-cover" />
                        ) : (
                          <Users className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-base flex items-center gap-2">
                          {team.name}
                          {team.code && (
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                              #{team.code}
                            </span>
                          )}
                        </div>
                        {team.slogan ? (
                          <div className="text-xs text-muted-foreground italic truncate">"{team.slogan}"</div>
                        ) : (
                          <div className="text-xs text-muted-foreground">{team.conditions.join(", ")}</div>
                        )}
                      </div>
                    </div>
                    {selectedTeam === team.id && (
                      <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-1 rounded">
                        Selected
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Button className="w-full h-12 text-lg" onClick={onNext}>
          {selectedTeam || teamCode ? t("onboarding.step9.joinContinue", "Join & Continue") : t("onboarding.continue", "Continue")}
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={onSkip}>
          {t("onboarding.skip", "Skip for now")}
        </Button>
      </div>
    </div>
  );
};
