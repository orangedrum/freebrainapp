/**
 * BLStepWantSupport — Step 7 of the BrainLover onboarding flow.
 *
 * "Want support?" — invite other BrainLovers who can support you and your FreeBrainer.
 * Reuses InviteCaregiverModal patterns (email input + Supabase OTP invite).
 * Skip option available.
 *
 * @param freeBrainerName — the connected FreeBrainer's display name
 * @param caregiverId     — the BrainLover's auth user id
 * @param onNext / onBack
 * @param speak
 */
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Volume2, ChevronRight, ArrowLeft, Users, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { sendBrainLoverInvite } from "@/lib/brainloverInvites";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";

interface BLStepWantSupportProps {
  freeBrainerName: string;
  caregiverId: string;
  patientId?: string | null;
  patientAvatar?: string | null;
  onNext: () => void;
  onBack: () => void;
  speak: (text: string) => void;
}

export const BLStepWantSupport: React.FC<BLStepWantSupportProps> = ({
  freeBrainerName,
  caregiverId,
  patientId,
  patientAvatar,
  onNext,
  onBack,
  speak,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [inviterDisplayName, setInviterDisplayName] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    const metaName = (user?.user_metadata as any)?.full_name || user?.user_metadata?.name || null;
    if (metaName) { setInviterDisplayName(metaName); return; }
    (async () => {
      const { data } = await safeSupabaseQuery<any>(() =>
        (supabase.from("profiles") as any)
          .select("display_name")
          .eq("user_id", user.id)
          .maybeSingle()
      );
      if (data?.display_name) {
        setInviterDisplayName(data.display_name);
      } else {
        // Fallback to email username
        const emailName = user?.email?.split("@")[0] || null;
        if (emailName) setInviterDisplayName(emailName);
      }
    })();
  }, [user?.id]);

  // During onboarding, the user may not have a profile yet — use displayName from onboarding state
  // (passed via user_metadata or email username as fallback)
  const effectiveInviterName = inviterDisplayName || user?.email?.split("@")[0] || null;
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  const name = freeBrainerName || t("onboarding.bl.yourFreeBrainer", "your FreeBrainer");

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) return;
    setIsSending(true);
    try {
      const result = await sendBrainLoverInvite(inviteEmail.trim(), {
        patientId: patientId || null,
        caregiverId,
        patientName: freeBrainerName || null,
        patientAvatar: patientAvatar || null,
        inviterName: effectiveInviterName,
        role: "caregiver",
        createdAt: Date.now(),
      });

      if (!result.success) {
        toast({
          title: t("onboarding.bl.inviteError", "Error sending invite"),
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setInviteSent(true);
      toast({
        title: t("onboarding.bl.inviteSentTitle", "Invite sent!"),
        description: t("onboarding.bl.inviteSentDesc", {
          email: inviteEmail.trim(),
          defaultValue: `An invitation has been sent to ${inviteEmail.trim()}`,
        }),
      });
    } catch (e: any) {
      toast({
        title: t("onboarding.bl.invitePreparedTitle", "Invite prepared"),
        description: t("onboarding.bl.invitePreparedDesc", {
          email: inviteEmail.trim(),
          defaultValue: `We'll send an invitation to ${inviteEmail.trim()}`,
        }),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-tight">
          {t("onboarding.bl.wantSupportTitle", "Want support?")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-primary/10 hover:bg-primary/20"
          onClick={() =>
            speak(
              `${t("onboarding.bl.wantSupportTitle", "Want support?")}. ${t(
                "onboarding.bl.wantSupportDesc",
                { name, defaultValue: `You can invite other BrainLovers to support you and ${name}.` }
              )}`
            )
          }
        >
          <Volume2 className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        </Button>
      </div>

      <p className="text-lg md:text-xl text-muted-foreground">
        {t("onboarding.bl.wantSupportDesc", {
          name,
          defaultValue: `You can invite other BrainLovers to support you and ${name}.`,
        })}
      </p>

      <div className="flex justify-center py-4">
        <div className="p-6 rounded-full bg-primary/10">
          <Users className="h-12 w-12 text-primary" />
        </div>
      </div>

      <div className="bg-muted/30 rounded-2xl p-4 border-2 space-y-3">
        <p className="text-sm text-muted-foreground">
          {t(
            "onboarding.bl.supportNote",
            "Other BrainLovers can cheer you on, share notes, and help keep your FreeBrainer moving."
          )}
        </p>
      </div>

      {inviteSent ? (
        <div className="bg-success/10 border-2 border-success/30 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <p className="text-base font-medium text-foreground">
            {t("onboarding.bl.inviteSentConfirm", "Invitation sent! They'll join you soon.")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-primary" />
            {t("onboarding.bl.inviteBrainLover", "Invite a BrainLover by email")}
          </Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="name@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="h-14 text-lg border-2 flex-1"
            />
            <Button
              className="h-14 px-4 shrink-0"
              disabled={!inviteEmail.trim() || !inviteEmail.includes("@") || isSending}
              onClick={handleSendInvite}
            >
              {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : t("onboarding.bl.send", "Send")}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 md:gap-4 pt-2">
        <Button className="w-full h-16 md:h-20 text-xl md:text-2xl" onClick={onNext}>
          {t("onboarding.bl.continueToSetup", "Continue to Account Setup")}
          <ChevronRight className="ml-2 h-6 w-6 md:h-8 md:w-8" />
        </Button>
        <Button variant="ghost" className="w-full h-12 text-lg" onClick={onNext}>
          {t("onboarding.bl.skipForNow", "Skip for now")}
        </Button>
        <Button variant="ghost" className="w-full h-12 text-lg" onClick={onBack}>
          <ArrowLeft className="mr-2 h-5 w-5" /> {t("onboarding.back", "Back")}
        </Button>
      </div>
    </div>
  );
};
