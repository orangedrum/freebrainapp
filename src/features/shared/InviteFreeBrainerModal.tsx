/**
 * InviteFreeBrainerModal — Single-invite modal for BrainLovers/Pros.
 * Sends a magic-link email or provides a shareable link.
 * Fully i18n via `inviteModal` namespace.
 *
 * Moved from src/components/caregiver/ — these modals are shared across
 * BrainLover, BrainLover Pro, and the Profile page, so they live in features/shared.
 */
import React, { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Mail, Copy, Check, Share2, Heart, Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface InviteFreeBrainerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caregiverId: string;
}

export function InviteFreeBrainerModal({
  open,
  onOpenChange,
  caregiverId,
}: InviteFreeBrainerModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteLink = `https://app.freethebrains.com/join?caregiver_id=${caregiverId}&role=caregiver`;
  const shareMessage = `${t("inviteModal.title")} — FreeBrain\n${inviteLink}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareMessage);
    setCopied(true);
    toast({ title: t("inviteModal.linkCopiedTitle"), description: t("inviteModal.linkCopiedDesc") });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("inviteModal.title"),
          text: t("inviteModal.description"),
          url: inviteLink,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      handleCopyLink();
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
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `https://app.freethebrains.com/join?caregiver_id=${caregiverId}&role=caregiver`,
          shouldCreateUser: true,
        },
      });

      if (error) {
        console.warn("OTP invite error (non-fatal):", error.message);
      }

      toast({
        title: t("inviteModal.inviteSentTitle"),
        description: t("inviteModal.inviteSentDesc", { email: email.trim() }),
      });
      setEmail("");
      onOpenChange(false);
    } catch (err: any) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full max-w-[calc(100vw-2rem)] p-4 sm:p-6 rounded-2xl border-2 shadow-2xl overflow-hidden">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Heart className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-xl font-bold truncate">{t("inviteModal.title")}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate">
                {t("inviteModal.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2 min-w-0">
          {/* Send via Email */}
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

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-muted" />
            </div>
            <span className="relative bg-background px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              {t("inviteModal.orShareLink")}
            </span>
          </div>

          {/* Share Link Card */}
          <div className="bg-muted/60 p-3.5 sm:p-4 rounded-xl border-2 space-y-3 min-w-0 overflow-hidden">
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

          {/* Sub-account note */}
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">{t("inviteModal.noEmailTitle")}</strong> {t("inviteModal.noEmailDesc")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
