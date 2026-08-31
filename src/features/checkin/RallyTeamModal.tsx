import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, ArrowRight, Check, Key, Plus, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { OPEN_TEAMS } from "@/components/onboarding/constants";

interface RallyTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onTeamJoined?: (team: any) => void;
  title?: string;
  description?: string;
}

export function RallyTeamModal({ 
  isOpen, 
  onClose, 
  userId, 
  onTeamJoined,
  title = "You Don't Have a Team Yet! 🙁",
  description = "Rallying notifies your team to send cheers and support. Find an open team, use a code, or create your own."
}: RallyTeamModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [teamCodeInput, setTeamCodeInput] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "code" | "create">("search");
  const [isJoining, setIsJoining] = useState(false);
  const [isLoadingTeams, setIsLoadingLoadingTeams] = useState(false);
  const [joinedTeamId, setJoinedTeamId] = useState<string | null>(null);
  const [dbTeams, setDbTeams] = useState<Array<{ id: string; name: string; conditions: string[]; code?: string }>>([]);

  // Fetch teams from Supabase when modal opens or tab changes to search
  useEffect(() => {
    if (!isOpen) return;

    const fetchTeams = async () => {
      setIsLoadingLoadingTeams(true);
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
            conditions: t.conditions && Array.isArray(t.conditions) ? t.conditions : ["Open Team"]
          }));
          
          // Combine DB teams with default sample teams if not already present
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
        console.warn("Could not fetch teams from DB, falling back to defaults:", err);
        setDbTeams(OPEN_TEAMS);
      } finally {
        setIsLoadingLoadingTeams(false);
      }
    };

    fetchTeams();
  }, [isOpen]);

  const filteredTeams = dbTeams.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.conditions.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleJoinOpenTeam = async (team: { id: string; name: string; conditions: string[]; code?: string }) => {
    setIsJoining(true);
    try {
      if (userId) {
        const isMockDev = userId === 'dev-user-id';
        if (!isMockDev && !userId.startsWith('new-')) {
          await safeSupabaseQuery(() => (supabase.from("team_members") as any).delete().eq("user_id", userId));
          const { error } = await safeSupabaseQuery(() => (supabase.from("team_members") as any).insert({
            user_id: userId,
            team_id: team.id
          }));
          if (error) console.warn("Team member DB save notice:", error.message);
        }
        localStorage.setItem(`dev_team_${userId}`, JSON.stringify(team));
      }
      setJoinedTeamId(team.id);
      toast({
        title: `Joined ${team.name}! 🎉`,
        description: "You're now part of the team. Rallies will reach your teammates!",
      });
      
      window.dispatchEvent(new CustomEvent("team_updated", { detail: team }));
      if (onTeamJoined) {
        onTeamJoined(team);
      }
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (e: any) {
      if (userId) {
        localStorage.setItem(`dev_team_${userId}`, JSON.stringify(team));
      }
      window.dispatchEvent(new CustomEvent("team_updated", { detail: team }));
      toast({
        title: "Joined Team",
        description: `Connected to ${team.name}.`,
      });
      if (onTeamJoined) onTeamJoined(team);
      onClose();
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = teamCodeInput.trim().toUpperCase();
    if (!cleanCode) return;
    setIsJoining(true);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode);
      let query = supabase.from("teams").select("*");
      if (isUuid) {
        query = query.or(`code.ilike.${cleanCode},id.eq.${cleanCode}`);
      } else {
        query = query.ilike("code", cleanCode);
      }
      const { data: teamData, error: lookupErr } = await query.maybeSingle();

      if (lookupErr) {
        console.warn("Team lookup notice:", lookupErr.message);
      }

      const foundTeam = teamData 
        ? { id: (teamData as any).id, name: (teamData as any).name, code: (teamData as any).code, conditions: (teamData as any).conditions || ["Custom Team"] }
        : null;

      if (!foundTeam) {
        toast({
          title: "Team Code Not Found",
          description: `No active team found with code "${cleanCode}". Please check the code or create a new team.`,
          variant: "destructive"
        });
        setIsJoining(false);
        return;
      }

      if (userId) {
        const isMockDev = userId === 'dev-user-id';
        if (!isMockDev && !userId.startsWith('new-')) {
          await safeSupabaseQuery(() => (supabase.from("team_members") as any).delete().eq("user_id", userId));
          const { error: insertErr } = await safeSupabaseQuery(() => (supabase.from("team_members") as any).insert({
            user_id: userId,
            team_id: foundTeam.id
          }));
          if (insertErr) console.warn("Team member insert notice:", insertErr.message);
        }
        localStorage.setItem(`dev_team_${userId}`, JSON.stringify(foundTeam));
      }

      window.dispatchEvent(new CustomEvent("team_updated", { detail: foundTeam }));
      toast({
        title: "Team Joined! 🎉",
        description: `Successfully joined ${foundTeam.name}`,
      });
      if (onTeamJoined) onTeamJoined(foundTeam);
      setTimeout(() => onClose(), 600);
    } catch (err: any) {
      toast({
        title: "Error Joining Team",
        description: err.message || "Could not join team. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setIsJoining(true);
    try {
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      let createdTeamObj: { id: string; name: string; code?: string; conditions: string[] } = {
        id: `new-${Date.now()}`,
        name: newTeamName.trim(),
        code: generatedCode,
        conditions: ["Custom Team"]
      };

      const isMockDev = !userId || userId === 'dev-user-id' || userId.startsWith('new-');

      if (!isMockDev) {
        const { data: insertedTeam, error: createError } = await (supabase.from("teams") as any)
          .insert({
            name: newTeamName.trim(),
            code: generatedCode,
            conditions: ["Custom Team"],
            created_by: userId
          })
          .select()
          .single();

        if (!createError && insertedTeam) {
          createdTeamObj = {
            id: insertedTeam.id,
            name: insertedTeam.name,
            code: insertedTeam.code || generatedCode,
            conditions: insertedTeam.conditions || ["Custom Team"]
          };

          await safeSupabaseQuery(() => (supabase.from("team_members") as any).delete().eq("user_id", userId));
          await safeSupabaseQuery(() => (supabase.from("team_members") as any).insert({
            user_id: userId,
            team_id: insertedTeam.id
          }));
        }
      }

      if (userId) {
        localStorage.setItem(`dev_team_${userId}`, JSON.stringify(createdTeamObj));
      }

      setDbTeams(prev => [createdTeamObj, ...prev]);
      window.dispatchEvent(new CustomEvent("team_updated", { detail: createdTeamObj }));

      toast({
        title: `Team "${createdTeamObj.name}" Created! 🚀`,
        description: `Your team code is ${createdTeamObj.code}. People can now search or join with this code!`,
      });
      
      if (onTeamJoined) onTeamJoined(createdTeamObj);
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      console.warn("Create team DB error fallback:", err);
      const fallbackTeam = { id: `new-${Date.now()}`, name: newTeamName, code: Math.floor(100000 + Math.random() * 900000).toString(), conditions: ["Custom Team"] };
      if (userId) {
        localStorage.setItem(`dev_team_${userId}`, JSON.stringify(fallbackTeam));
      }
      setDbTeams(prev => [fallbackTeam, ...prev]);
      window.dispatchEvent(new CustomEvent("team_updated", { detail: fallbackTeam }));
      if (onTeamJoined) onTeamJoined(fallbackTeam);
      setTimeout(() => onClose(), 800);
    } finally {
      setIsJoining(false);
    }
  };
  const handleFullOnboardingFlow = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md w-full max-w-[calc(100vw-2rem)] bg-card text-card-foreground border-border max-h-[90vh] overflow-y-auto p-4 sm:p-6 overflow-x-hidden">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <Users className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl sm:text-2xl text-center font-bold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selection */}
        <div className="flex bg-muted p-1 rounded-lg gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "search" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Open Teams
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "code" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Team Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "create" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            New Team
          </button>
        </div>

        {/* TAB 1: SEARCH OPEN TEAMS */}
        {activeTab === "search" && (
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by team name or condition..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {isLoadingTeams ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading available teams...
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {filteredTeams.map((team) => {
                  const isJoined = joinedTeamId === team.id;
                  return (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm leading-none">{team.name}</p>
                          {team.code && (
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1 rounded">
                              #{team.code}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {team.conditions.map((c) => (
                            <Badge key={c} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isJoined ? "default" : "outline"}
                        disabled={isJoining || isJoined}
                        onClick={() => handleJoinOpenTeam(team)}
                        className="shrink-0 font-semibold"
                      >
                        {isJoined ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Joined
                          </span>
                        ) : (
                          "Join"
                        )}
                      </Button>
                    </div>
                  );
                })}
                {filteredTeams.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-3">
                    No matching teams found.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HAVE A TEAM CODE? */}
        {activeTab === "code" && (
          <form onSubmit={handleJoinByCode} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Have a Team Code?
              </label>
              <Input
                placeholder="Enter 6-digit code..."
                value={teamCodeInput}
                onChange={(e) => setTeamCodeInput(e.target.value)}
                className="uppercase tracking-widest text-center text-lg font-mono"
                maxLength={8}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={isJoining || !teamCodeInput.trim()}
            >
              <Key className="w-4 h-4 mr-2" />
              Join with Code
            </Button>
          </form>
        )}

        {/* TAB 3: START A NEW TEAM */}
        {activeTab === "create" && (
          <form onSubmit={handleCreateTeam} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Or Start a New Team
              </label>
              <Input
                placeholder="Name your team (e.g. Brain Strikers)"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={isJoining || !newTeamName.trim()}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Create & Join Team
            </Button>
          </form>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto font-medium"
            onClick={handleFullOnboardingFlow}
          >
            Full Onboarding <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
          <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
