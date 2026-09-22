/**
 * SessionInviteBanner — shows unread virtual-session invites (the first
 * reader of the `session_notifications` table). One card per invite with
 * the scheduler's message and a dismiss that marks it read.
 */
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SessionInvite } from "@/features/sessions/useSessionNotifications";

interface SessionInviteBannerProps {
  invites: SessionInvite[];
  onDismiss: (id: string) => void;
}

export const SessionInviteBanner: React.FC<SessionInviteBannerProps> = ({
  invites,
  onDismiss,
}) => {
  const { t } = useTranslation();
  if (invites.length === 0) return null;

  return (
    <div className="space-y-2">
      {invites.map((invite) => (
        <Card key={invite.id} className="border-2 border-info/30 bg-info/5">
          <CardContent className="p-4 flex items-start gap-3">
            <CalendarClock className="h-5 w-5 text-info shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">
                {t("sessionInvite.title", "Session invite")}
              </p>
              {invite.message && (
                <p className="text-sm text-muted-foreground mt-0.5">{invite.message}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => onDismiss(invite.id)}
            >
              {t("sessionInvite.dismiss", "Got it")}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
