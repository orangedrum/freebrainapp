/**
 * LeaveTeamButton — ghost button + confirm dialog for leaving a team.
 *
 * Extracted from TeamSection for modularity (ADR 001).
 * Deletes the user's team_members row and clears the localStorage cache.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { LogOut, Loader2 } from "lucide-react";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface LeaveTeamButtonProps {
  teamId: string;
  teamName: string;
  onLeft: () => void;
  /** When provided, leaves the team for this user instead of the logged-in user (e.g. BrainLover acting on behalf of FreeBrainer) */
  overrideUserId?: string;
}

export function LeaveTeamButton({ teamId, teamName, onLeft, overrideUserId }: LeaveTeamButtonProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleLeave = async () => {
    if (!user) return;
    setLeaving(true);
    try {
      const leaveUserId = overrideUserId || user.id;
      await safeSupabaseQuery(() =>
        (supabase.from("team_members") as any)
          .delete()
          .eq("user_id", leaveUserId)
          .eq("team_id", teamId)
      );
      toast({ title: t("roster.leftTeam", "Left the team") });
      setConfirmOpen(false);
      onLeft();
    } catch {
      toast({ title: t("roster.leaveError", "Failed to leave team"), variant: "destructive" });
    } finally {
      setLeaving(false);
    }
  };

  return (
    <>
      <div className="border-t border-border/40 pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5"
          onClick={() => setConfirmOpen(true)}
        >
          <LogOut className="h-3.5 w-3.5" />
          {t("roster.leaveTeam", "Leave Team")}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-destructive" />
              {t("roster.leaveTeam", "Leave Team")}
            </DialogTitle>
            <DialogDescription>
              {t("roster.leaveTeamConfirm", "Are you sure you want to leave \"{{name}}\"? You'll lose your team rank and streak contribution.", { name: teamName })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="text-xs font-semibold">
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeave}
              disabled={leaving}
              className="gap-2 text-xs font-bold"
            >
              {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {t("roster.leaveTeam", "Leave Team")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
