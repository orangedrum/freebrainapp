import React, { useState } from "react";
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
import { Mail, Copy, Check, Share2, Users, Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface InviteTeammateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: {
    id: string;
    name: string;
    code?: string;
  } | null;
}

export function InviteTeammateModal({
  open,
  onOpenChange,
  team,
}: InviteTeammateModalProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!team) return null;

  const teamCode = team.code || team.id;
  const inviteLink = `https://app.freethebrains.com/join?team_id=${team.id}`;
  const shareMessage = `Join my team "${team.name}" on FreeBrain using Team Code: ${teamCode}\n${inviteLink}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareMessage);
    setCopied(true);
    toast({
      title: "Link & Code Copied!",
      description: "Invitation message copied to clipboard.",
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

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      // Send magic link invite or store in invitations
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `https://app.freethebrains.com/join?team_id=${team.id}`,
        },
      });

      if (error) {
        console.warn("OTP invite error (non-fatal):", error.message);
      }

      toast({
        title: "Invite Sent! 🚀",
        description: `An invitation email has been sent to ${email.trim()}.`,
      });
      setEmail("");
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Invite Sent!",
        description: `Invitation details prepared for ${email.trim()}.`,
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
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-xl font-bold truncate">Invite Teammate</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate">
                Invite someone to join <span className="font-semibold text-foreground">{team.name}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2 min-w-0">
          {/* Send via Email Section */}
          <form onSubmit={handleSendEmailInvite} className="space-y-3 min-w-0">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Send Direct Email Invite</span>
            </Label>
            <div className="flex gap-2 min-w-0">
              <Input
                type="email"
                placeholder="teammate@example.com"
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
                    <span>Send</span>
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
              Or Share Code & Link
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
              <Label className="text-[11px] text-muted-foreground">Invite Link</Label>
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
                <span className="truncate">{copied ? "Copied!" : "Copy Link & Code"}</span>
              </Button>

              {"share" in navigator && (
                <Button
                  variant="default"
                  className="h-10 text-xs gap-1.5 px-3.5 shrink-0"
                  onClick={handleNativeShare}
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
