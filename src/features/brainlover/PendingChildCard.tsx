/**
 * PendingChildCard — parent-invite flow waiting state on the BrainLover
 * dashboard. Shown when the parent's child stopped at the age gate (step 12)
 * and hasn't finished onboarding yet (no caregiver_links row, no profiles
 * row — only the brainlover_invites row exists).
 *
 * Shows the child's avatar/name + "waiting for them to finish" copy + a
 * resend CTA that re-sends the child's finish-link.
 */
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hourglass, Mail, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { getAvatarUrl } from "@/lib/avatar";
import { sendChildFinishInvite } from "@/lib/brainloverInvites";
import { resendCooldownRemaining, markResent, cooldownMinutesLeft } from "@/lib/resendCooldown";

interface PendingChildCardProps {
  childName: string | null;
  childAvatar: string | null;
  childEmail: string;
}

export const PendingChildCard: React.FC<PendingChildCardProps> = ({
  childName,
  childAvatar,
  childEmail,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(() => resendCooldownRemaining(childEmail));
  const name = childName || t("caregiverDashboard.pendingChildFallback", "Your FreeBrainer");

  // Re-enable the button when the 5-minute cooldown expires.
  useEffect(() => {
    if (cooldownMs <= 0) return;
    const timer = setTimeout(() => setCooldownMs(resendCooldownRemaining(childEmail)), 30000);
    return () => clearTimeout(timer);
  }, [cooldownMs, childEmail]);

  const handleResend = async () => {
    if (resendCooldownRemaining(childEmail) > 0) {
      setCooldownMs(resendCooldownRemaining(childEmail));
      return;
    }
    setSending(true);
    try {
      const result = await sendChildFinishInvite(childEmail);
      if (result.success) {
        markResent(childEmail);
        setCooldownMs(resendCooldownRemaining(childEmail));
      } else {
        toast({
          title: t("caregiverDashboard.pendingChildResendFailed", "Couldn't re-send the link"),
          description: result.error || undefined,
          variant: "destructive",
        });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
        <img
          src={childAvatar || getAvatarUrl(name)}
          alt={name}
          className="h-20 w-20 rounded-full object-cover border-4 border-primary/20 shadow bg-primary/10"
        />
        <h3 className="text-xl font-bold">{name}</h3>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Hourglass className="h-4 w-4 text-primary" />
          <p className="text-sm">
            {t("caregiverDashboard.pendingChildDesc", "They haven't finished setting up their account yet. We'll email them a link to finish once they're ready — or resend it now.")}
          </p>
        </div>
        {cooldownMs > 0 ? (
          <>
            <p className="flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" />
              {t("caregiverDashboard.pendingChildResent", "Finish-link re-sent!")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("caregiverDashboard.pendingChildCooldown", {
                minutes: cooldownMinutesLeft(cooldownMs),
                defaultValue: `You can resend again in about ${cooldownMinutesLeft(cooldownMs)} min.`,
              })}
            </p>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={sending}
            className="gap-1.5"
          >
            <Mail className="h-4 w-4" />
            {sending
              ? t("onboarding.magicAuth.sending", "Sending...")
              : t("caregiverDashboard.pendingChildResend", "Resend their finish-link")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
