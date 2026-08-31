/**
 * InviteBrainLoverChoiceModal — Asks the BrainLover which type of person
 * they want to invite before showing the email input.
 *
 * Two options:
 *  1. "Support my FreeBrainer" — invites someone to co-support the same
 *     FreeBrainer (uses InviteCaregiverModal flow with patient context).
 *  2. "Someone with a brain condition" — invites someone who has their
 *     own FreeBrainer to join FreeBrain as a BrainLover (no patient link,
 *     goes through the standard BrainLover onboarding).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Brain, Users, Mail, Send, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type InviteMode = "choice" | "support" | "platform";

interface InviteBrainLoverChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The FreeBrainer being supported (for option 1) */
  patientId?: string;
  patientName?: string;
  patientAvatar?: string | null;
  caregiverId: string;
  /** Inviter's display name */
  inviterName?: string;
}

export function InviteBrainLoverChoiceModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  patientAvatar,
  caregiverId,
  inviterName,
}: InviteBrainLoverChoiceModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [mode, setMode] = useState<InviteMode>("choice");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleClose = () => {
    setMode("choice");
    setEmail("");
    onClose();
  };

  // Option 2: Platform invite — no patient link, just join FreeBrain as a BrainLover
  const handlePlatformInvite = async () => {
    if (!email.trim() || !email.includes("@")) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `https://app.freethebrains.com/onboarding?role=caregiver&invited_by=${caregiverId}`,
          shouldCreateUser: true,
          data: {
            fb_invite_role: "caregiver",
            fb_invite_caregiver_id: caregiverId,
            fb_invite_inviter_name: inviterName || null,
            fb_invite_patient_id: null,
            fb_invite_platform_invite: true,
          },
        },
      });

      if (error) {
        console.warn("[FB-DEBUG] Platform invite OTP error:", error.message);
      }

      toast({
        title: t("inviteBLChoice.platformSent", "Invite sent!"),
        description: t("inviteBLChoice.platformSentDesc", {
          email: email.trim(),
          defaultValue: `Sent an invitation to ${email.trim()}. They'll go through BrainLover onboarding to set up their own FreeBrainer.`,
        }),
      });
      handleClose();
    } catch (e: any) {
      toast({
        title: t("inviteBLChoice.error", "Failed to send"),
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md w-full max-w-[calc(100vw-2rem)] p-4 sm:p-6 rounded-2xl border-2 shadow-2xl overflow-hidden">
        {mode === "choice" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t("inviteBLChoice.title", "Invite a BrainLover")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("inviteBLChoice.subtitle", "Who would you like to invite?")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              {/* Option 1: Support my FreeBrainer */}
              <button
                onClick={() => setMode("support")}
                className="w-full text-left rounded-xl border-2 border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all p-4 space-y-1.5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Heart className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {t("inviteBLChoice.supportTitle", "Support my FreeBrainer")}
                    </p>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {t("inviteBLChoice.supportDesc", {
                        name: patientName?.split(" ")[0] || "your FreeBrainer",
                        defaultValue: `Invite someone to help you support ${patientName?.split(" ")[0] || "your FreeBrainer"} — they'll see the same dashboard and logs.`,
                      })}
                    </p>
                  </div>
                </div>
              </button>

              {/* Option 2: Someone with their own FreeBrainer */}
              <button
                onClick={() => setMode("platform")}
                className="w-full text-left rounded-xl border-2 border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all p-4 space-y-1.5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {t("inviteBLChoice.platformTitle", "Someone with a brain condition")}
                    </p>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {t("inviteBLChoice.platformDesc", "Invite someone who loves someone with a brain condition to join FreeBrain and create their own FreeBrainer account.")}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {mode === "support" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <button onClick={() => setMode("choice")} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                {t("inviteBLChoice.supportTitle", "Support my FreeBrainer")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("inviteBLChoice.supportDesc", {
                  name: patientName?.split(" ")[0] || "your FreeBrainer",
                  defaultValue: `Invite someone to help you support ${patientName?.split(" ")[0] || "your FreeBrainer"}.`,
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  {t("inviteBLChoice.emailLabel", "Their email address")}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9 text-sm h-11 border-2 w-full"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !sending && handleSupportInvite()}
                  />
                </div>
              </div>
              <Button
                className="w-full h-11 font-semibold gap-2"
                onClick={handleSupportInvite}
                disabled={!email.trim() || sending}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t("inviteBLChoice.sendInvite", "Send Invite")}
              </Button>
            </div>
          </>
        )}

        {mode === "platform" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <button onClick={() => setMode("choice")} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                {t("inviteBLChoice.platformTitle", "Someone with a brain condition")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("inviteBLChoice.platformDesc", "Invite someone who loves someone with a brain condition to join FreeBrain.")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  {t("inviteBLChoice.emailLabel", "Their email address")}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9 text-sm h-11 border-2 w-full"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !sending && handlePlatformInvite()}
                  />
                </div>
              </div>
              <Button
                className="w-full h-11 font-semibold gap-2"
                onClick={handlePlatformInvite}
                disabled={!email.trim() || sending}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t("inviteBLChoice.sendInvite", "Send Invite")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  // Option 1: Support invite — delegates to sendBrainLoverInvite with patient context
  async function handleSupportInvite() {
    if (!email.trim() || !email.includes("@")) return;
    setSending(true);
    try {
      const { sendBrainLoverInvite } = await import("@/lib/brainloverInvites");
      const result = await sendBrainLoverInvite(email.trim(), {
        patientId: patientId || null,
        caregiverId,
        patientName: patientName || null,
        patientAvatar: patientAvatar || null,
        inviterName: inviterName || null,
        role: "caregiver",
        createdAt: Date.now(),
      });

      if (!result.success) {
        toast({
          title: t("inviteBLChoice.error", "Failed to send"),
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("inviteBLChoice.supportSent", "Invite sent!"),
        description: t("inviteBLChoice.supportSentDesc", {
          email: email.trim(),
          defaultValue: `An invitation to support ${patientName?.split(" ")[0] || "your FreeBrainer"} has been sent to ${email.trim()}.`,
        }),
      });
      handleClose();
    } catch (e: any) {
      toast({
        title: t("inviteBLChoice.error", "Failed to send"),
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }
}
