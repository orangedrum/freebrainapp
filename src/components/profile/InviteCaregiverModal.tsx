/**
 * InviteCaregiverModal — Invite another BrainLover to support a FreeBrainer.
 *
 * When a BrainLover invites another BrainLover, the invite link includes
 * the patient_id so the new BrainLover gets linked to the same FreeBrainer
 * AND joins the same team automatically.
 *
 * Fully i18n via `inviteCaregiverModal.*` namespace.
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendBrainLoverInvite } from "@/lib/brainloverInvites";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";

interface InviteCaregiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userRole: string;
  /** The FreeBrainer ID to link the new BrainLover to (so they share the same team) */
  patientId?: string;
  /** The FreeBrainer's display name (passed through the invite link for the invited BL onboarding) */
  patientName?: string;
  /** The FreeBrainer's avatar URL (passed through the invite for the invited BL onboarding) */
  patientAvatar?: string | null;
  /** The inviting BrainLover's display name (passed through the invite link) */
  inviterName?: string;
}

export function InviteCaregiverModal({ isOpen, onClose, userId, userRole, patientId, patientName, patientAvatar, inviterName }: InviteCaregiverModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [caregiverEmail, setCaregiverEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Resolve inviter name: prop → user_metadata → profiles table
  const [resolvedInviterName, setResolvedInviterName] = useState<string | null>(inviterName || null);
  useEffect(() => {
    if (inviterName) { setResolvedInviterName(inviterName); return; }
    if (!userId) return;
    (async () => {
      const { data } = await safeSupabaseQuery<any>(() =>
        (supabase.from("profiles") as any)
          .select("display_name")
          .eq("user_id", userId)
          .maybeSingle()
      );
      if (data?.display_name) {
        setResolvedInviterName(data.display_name);
      } else {
        // Fallback: try to get email from session
        const { data: sessionData } = await supabase.auth.getSession();
        const emailName = sessionData.session?.user?.email?.split("@")[0] || null;
        if (emailName) setResolvedInviterName(emailName);
      }
    })();
  }, [inviterName, userId]);

  const isCaregiver = userRole === "caregiver" || userRole === "pro" || userRole === "brainlover";

  const handleInviteCaregiver = async () => {
    if (!caregiverEmail || !userId) return;
    try {
      setIsSending(true);

      const result = await sendBrainLoverInvite(caregiverEmail, {
        patientId: patientId || null,
        caregiverId: userId,
        patientName: patientName || null,
        patientAvatar: patientAvatar || null,
        inviterName: resolvedInviterName,
        role: "caregiver",
        createdAt: Date.now(),
      });

      if (!result.success) {
        toast({
          title: t("inviteCaregiverModal.error", "Error sending invite"),
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("inviteCaregiverModal.sent", "Invite sent!"),
        description: t("inviteCaregiverModal.sentDesc", { email: caregiverEmail }),
      });
      setCaregiverEmail("");
      onClose();
    } catch (error: any) {
      toast({
        title: t("inviteCaregiverModal.error", "Error sending invite"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md w-full max-w-[calc(100vw-2rem)] p-4 sm:p-6 rounded-2xl border-2 shadow-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {t("inviteCaregiverModal.title", "Invite a BrainLover")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t(
              "inviteCaregiverModal.description",
              "Invite someone who can help you support your FreeBrainer."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 min-w-0">
          <div className="space-y-2 min-w-0">
            <Label className="text-xs font-semibold">
              {t("inviteCaregiverModal.emailLabel", "BrainLover's Email")}
            </Label>
            <div className="relative min-w-0">
              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 text-sm h-11 border-2 w-full min-w-0"
                type="email"
                placeholder="name@example.com"
                value={caregiverEmail}
                onChange={(e) => setCaregiverEmail(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="w-full h-11 font-semibold gap-2"
            onClick={handleInviteCaregiver}
            disabled={!caregiverEmail || isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("inviteCaregiverModal.sending", "Sending...")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t("inviteCaregiverModal.send", "Send Invitation")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
