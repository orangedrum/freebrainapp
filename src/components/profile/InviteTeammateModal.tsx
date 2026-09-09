import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, Copy, Check, Share2, Users, Send, Loader2, Heart, Brain, ArrowLeft } from "lucide-react";
import { ExistingUserSearch } from "@/components/shared/ExistingUserSearch";
import { connectToTeam, sendSmartInvite, DirectoryUser } from "@/lib/userDirectory";
import { buildJoinLink } from "@/lib/brainloverInvites";

interface InviteTeammateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: {
    id: string;
    name: string;
    code?: string;
  } | null;
  /** When an existing FreeBrainer is being supported, "Add a BrainLover"
   *  carries this patient context so the invitee routes through the invited
   *  BrainLover onboarding and gets linked + synced to the same team. */
  patientId?: string | null;
  patientName?: string | null;
  patientAvatar?: string | null;
  /** A BrainLover inviting teammates; used as the caretaker reference on
   *  FreeBrainer invites. */
  caregiverId?: string | null;
  /** The inviter's display name (shown on the invitee's onboarding). */
  inviterName?: string | null;
}

type InviteRole = "freebrainer" | "brainlover";

export function InviteTeammateModal({
  open,
  onOpenChange,
  team,
  patientId,
  patientName,
  patientAvatar,
  caregiverId,
  inviterName,
}: InviteTeammateModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<InviteRole | null>(null);

  // Reset the role chooser + form whenever the modal opens.
  useEffect(() => {
    if (open) {
      setInviteRole(null);
      setEmail("");
      setCopied(false);
    }
  }, [open]);

  if (!team) return null;

  const teamCode = team.code || team.id;
  const inviteLink = buildJoinLink({
    teamId: team.id,
    patientId: inviteRole === "brainlover" ? patientId : null,
    caregiverId,
    kind: inviteRole === "freebrainer"
      ? "join_as_freebrainer"
      : (inviteRole === "brainlover" ? (patientId ? "support_existing_fb" : "join_as_brainlover") : null),
    fbName: patientName,
    inviterName,
  });
  const shareMessage = `Join my team "${team.name}" on FreeBrain using Team Code: ${teamCode}\n${inviteLink}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareMessage);
    setCopied(true);
    toast({
      title: t("inviteModal.linkCopiedTitle"),
      description: t("inviteModal.linkCopiedDesc"),
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${team.name} on FreeBrain`,
          text: `Join my team "${team.name}" on FreeBrain using Team Code: ${teamCode}`,
          url: inviteLink,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const handleConnectExisting = async (user: DirectoryUser) => {
    setBusyUserId(user.user_id);
    const res = await connectToTeam(team.id, user.user_id);
    setBusyUserId(null);

    if (res.ok) {
      toast({
        title: t("inviteModal.teamConnectedTitle"),
        description: t("inviteModal.teamConnectedDesc", {
          name: user.display_name || "Teammate",
          team: team.name,
        }),
      });
      onOpenChange(false);
    } else {
      toast({
        title: t("inviteModal.connectFailedTitle"),
        description: t("inviteModal.connectFailedDesc"),
        variant: "destructive",
      });
    }
  };

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast({
        title: t("inviteModal.invalidEmailTitle"),
        description: t("inviteModal.invalidEmailDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const cleanEmail = email.trim();

      // ── Add a BrainLover: co-supporter of the (existing) FreeBrainer, or a
      //    supporter joining a brand-new FreeBrainer (no patient context). ──
      if (inviteRole === "brainlover") {
        const { sendBrainLoverInvite } = await import("@/lib/brainloverInvites");
        const result = await sendBrainLoverInvite(cleanEmail, {
          patientId,
          caregiverId: caregiverId || "",
          patientName: patientName || null,
          patientAvatar: patientAvatar || null,
          inviterName: inviterName || null,
          role: "caregiver",
          createdAt: Date.now(),
        }, { teamId: team.id });

        if (!result.success) {
          toast({
            title: t("inviteModal.connectFailedTitle"),
            description: result.error,
            variant: "destructive",
          });
        } else {
          toast({
            title: t("inviteModal.inviteSentTitle"),
            description: t("inviteModal.inviteSentDesc", { email: cleanEmail }),
          });
        }
        setEmail("");
        onOpenChange(false);
        return;
      }

      // ── Add a FreeBrainer: invitee goes through the full FreeBrainer
      //    onboarding and (when the inviter is a BrainLover) gets linked. ──
      if (inviteRole === "freebrainer") {
        const { sendTeamFreeBrainerInvite } = await import("@/lib/brainloverInvites");
        const result = await sendTeamFreeBrainerInvite(cleanEmail, {
          teamId: team.id,
          caregiverId,
        });

        if (!result.success) {
          toast({
            title: t("inviteModal.connectFailedTitle"),
            description: result.error,
            variant: "destructive",
          });
        } else {
          toast({
            title: t("inviteModal.inviteSentTitle"),
            description: t("inviteModal.inviteSentDesc", { email: cleanEmail }),
          });
        }
        setEmail("");
        onOpenChange(false);
        return;
      }

      // ── No role chosen (defensive): plain team invite. ──
      const { wasExistingUser, error } = await sendSmartInvite({
        email: cleanEmail,
        existingRedirect: `/join?team_id=${team.id}`,
        newRedirect: `/join?team_id=${team.id}`,
      });

      if (error) {
        console.warn("OTP invite error (non-fatal):", error);
      }

      toast({
        title: wasExistingUser
          ? t("inviteModal.inviteSentExistingTitle")
          : t("inviteModal.inviteSentTitle"),
        description: wasExistingUser
          ? t("inviteModal.existingUserDesc", { email: cleanEmail })
          : t("inviteModal.inviteSentDesc", { email: cleanEmail }),
      });
      setEmail("");
      onOpenChange(false);
    } catch {
      toast({
        title: t("inviteModal.invitePreparedTitle"),
        description: t("inviteModal.invitePreparedDesc", { email: email.trim() }),
      });
      setEmail("");
      onOpenChange(false);
    } finally {
      setIsSending(false);
    }
  };

  const pickRole = (nextRole: InviteRole) => {
    setInviteRole(nextRole);
    setEmail("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full max-w-[calc(100vw-2rem)] p-4 sm:p-6 rounded-2xl border-2 shadow-2xl overflow-hidden">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              {inviteRole ? <Users className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-xl font-bold truncate">
                {inviteRole === null
                  ? t("inviteModal.chooseInviteeTitle", "Who are you adding?")
                  : inviteRole === "brainlover"
                    ? t("inviteModal.addBrainLover", "Add a BrainLover")
                    : t("inviteModal.addFreeBrainer", "Add a FreeBrainer")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate">
                {inviteRole === null
                  ? t("inviteModal.chooseInviteeDesc", "Invite someone to join your team.")
                  : inviteRole === "brainlover"
                    ? (patientId ? patientName : team.name)
                    : t("inviteModal.addFreeBrainerDesc", "They'll start with FreeBrainer onboarding.")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2 min-w-0">
          {inviteRole === null ? (
            // ── Role chooser ──
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-auto py-4 justify-start gap-3 border-2"
                onClick={() => pickRole("brainlover")}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Heart className="h-5 w-5" />
                </div>
                <div className="text-left min-w-0">
                  <div className="font-semibold">{t("inviteModal.addBrainLover", "Add a BrainLover")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("inviteModal.addBrainLoverDesc", "A supporter who will love and cheer them on.")}
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto py-4 justify-start gap-3 border-2"
                onClick={() => pickRole("freebrainer")}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Brain className="h-5 w-5" />
                </div>
                <div className="text-left min-w-0">
                  <div className="font-semibold">{t("inviteModal.addFreeBrainer", "Add a FreeBrainer")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("inviteModal.addFreeBrainerDesc2", "A friend living with a brain condition, starting their journey.")}
                  </div>
                </div>
              </Button>
            </div>
          ) : (
            <>
              {/* Role-aware back link */}
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground -mt-2" onClick={() => pickRole(null)}>
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("inviteModal.backToChoose", "Change")}
              </Button>

              {/* Send via Email Section */}
              <form onSubmit={handleSendEmailInvite} className="space-y-3 min-w-0">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{t("inviteModal.emailLabel")}</span>
                </Label>
                <div className="flex gap-2 min-w-0">
                  <Input
                    type="email"
                    placeholder={t("inviteModal.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 border-2 text-sm flex-1 min-w-0"
                  />
                  <Button type="submit" disabled={isSending} className="h-11 px-4 shrink-0 gap-1.5 whitespace-nowrap">
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>{t("inviteModal.send")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>

              <ExistingUserSearch
                onConnect={handleConnectExisting}
                connectLabel={t("inviteModal.addTeammate")}
                busyUserId={busyUserId}
              />

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted" />
                </div>
                <span className="relative bg-background px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  {t("inviteModal.orShareLink")}
                </span>
              </div>

              {/* Team Code & Share Link Card */}
              <div className="bg-muted/60 p-3.5 sm:p-4 rounded-xl border-2 space-y-3 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Team Code</span>
                  <Badge variant="outline" className="font-mono text-sm px-2.5 py-1 bg-background border-2 font-bold tracking-wider shrink-0">
                    {teamCode}
                  </Badge>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <Label className="text-[11px] text-muted-foreground">{t("inviteModal.inviteLinkLabel")}</Label>
                  <div className="bg-background border rounded-lg p-2.5 text-xs font-mono truncate text-muted-foreground select-all w-full min-w-0 block">
                    {inviteLink}
                  </div>
                </div>

                <div className="flex gap-2 pt-1 min-w-0">
                  <Button
                    variant="outline"
                    className="flex-1 min-w-0 h-10 text-xs border-2 gap-1.5 font-medium truncate"
                    onClick={handleCopyLink}
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
                    <span className="truncate">{copied ? t("inviteModal.copied") : t("inviteModal.copyLink")}</span>
                  </Button>

                  {"share" in navigator && (
                    <Button
                      variant="default"
                      className="h-10 text-xs gap-1.5 px-3.5 shrink-0"
                      onClick={handleNativeShare}
                    >
                      <Share2 className="h-4 w-4" />
                      <span>{t("inviteModal.share")}</span>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}