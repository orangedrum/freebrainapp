/**
 * BrainLoverEmptyState — full-page empty state shown when a BrainLover
 * has zero connected FreeBrainers.
 *
 * Layout:
 *  1. FreeBrain logo + title
 *  2. "You must really love someone's brain!" message
 *  3. Big CTA: "Invite your FreeBrainer"
 *  4. Small link: "I'm not a BrainLover" → confirmation → delete + restart
 *  5. Daily brain fact at bottom
 *
 * No bottom nav should be visible at this stage — the parent dashboard
 * handles that by checking `isEmpty` state.
 *
 * i18n: all strings via `emptyState` namespace.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Heart, UserPlus, Activity, AlertTriangle, Loader2 } from "lucide-react";
import { DailyBrainFact } from "@/components/shared/DailyBrainFact";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { isDevBypassUser } from "@/lib/devBypass";

interface BrainLoverEmptyStateProps {
  onInvite: () => void;
}

export function BrainLoverEmptyState({ onInvite }: BrainLoverEmptyStateProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleNotABrainLover = async () => {
    if (!user) return;
    setDeleting(true);

    try {
      if (isDevBypassUser(user.id)) {
        // Dev-bypass: just sign out and restart onboarding
        localStorage.removeItem("dev_role_override");
        toast({ title: t("emptyState.resetComplete", "Account reset. Starting over.") });
        navigate("/onboarding");
        return;
      }

      // Delete the user's account data (profiles row + auth user)
      // The auth user deletion requires the service role key via a
      // Supabase function, but we can remove their profile row and
      // sign them out. They'll re-onboard with a fresh email.
      await supabase.from("profiles").delete().eq("user_id", user.id);
      await supabase.from("user_roles").delete().eq("user_id", user.id);
      await supabase.from("caregiver_links").delete().eq("caregiver_id", user.id);

      toast({ title: t("emptyState.resetComplete", "Account reset. Starting over.") });
      await signOut();
      navigate("/auth");
    } catch (e) {
      console.error("[FB-DEBUG] BrainLoverEmptyState delete error:", e);
      toast({
        title: t("emptyState.resetError", "Could not reset account. Please try again."),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6 px-4 text-center">
      {/* ── FreeBrain logo + title ── */}
      <div className="flex items-center gap-2">
        <div className="p-3 rounded-2xl bg-primary/15">
          <Activity className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-heading font-bold text-2xl text-primary">FreeBrain</h1>
      </div>

      {/* ── Welcome message ── */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">
          {t("emptyState.brainLoverWelcome", "You must really love someone's brain!")}
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t("emptyState.brainLoverRole", "That makes you a FreeBrain BrainLover — someone who keeps their loved one moving daily.")}
        </p>
      </div>

      {/* ── Big CTA ── */}
      <Card className="w-full max-w-md border-primary/30 bg-primary/5 shadow-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/15">
              <Heart className="h-7 w-7 text-primary" />
            </div>
          </div>
          <p className="text-sm font-medium text-foreground">
            {t("emptyState.invitePrompt", "Invite your FreeBrainer to get started.")}
          </p>
          <Button
            onClick={onInvite}
            size="lg"
            className="w-full gap-2 font-bold text-base"
          >
            <UserPlus className="h-5 w-5" />
            {t("emptyState.inviteFreeBrainer", "Invite your FreeBrainer")}
          </Button>

          {/* ── "I'm not a BrainLover" link ── */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                {t("emptyState.notABrainLover", "I'm not a BrainLover")}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  {t("emptyState.confirmResetTitle", "Are you sure?")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("emptyState.confirmResetDesc", "This will delete your account and restart the onboarding process. You'll need to sign up again with a different role.")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>
                  {t("common.cancel", "Cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleNotABrainLover}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  {t("emptyState.confirmReset", "Yes, restart")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* ── Daily brain fact ── */}
      <div className="w-full max-w-md">
        <DailyBrainFact />
      </div>
    </div>
  );
}
