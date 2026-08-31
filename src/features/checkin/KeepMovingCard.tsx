/**
 * KeepMovingCard — shown on the FreeBrainer dashboard after they've
 * already checked in today. Lets them do an additional movement session
 * (bonus points) without going through the full check-in flow again.
 *
 * Reuses CheckInFlow with the same useCheckInData instance — no
 * redundant data fetching. The card is collapsible so it doesn't
 * take up excessive real estate.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, ChevronDown, ChevronUp } from "lucide-react";
import { CheckInFlow } from "@/features/checkin/CheckInFlow";
import { useCheckInData } from "@/features/checkin/useCheckInData";
import { ActivityLogInput } from "@/features/checkin/ActivityLogInput";
import { useAuth } from "@/contexts/AuthContext";

export function KeepMovingCard() {
  const { t } = useTranslation();
  const ci = useCheckInData();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-4 sm:p-5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={expanded}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-success/15">
                <Dumbbell className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="font-bold text-base">
                  {t("checkin.keepMovingTitle", "Want to keep moving?")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("checkin.keepMovingDesc", "You've checked in today — but you can always do another session for bonus points!")}
                </p>
              </div>
            </div>
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
          </button>

          {expanded && (
            <div className="mt-4 pt-4 border-t border-success/20 space-y-3">
              <Button
                size="lg"
                className="w-full h-14 text-base font-bold"
                onClick={() => setIsOpen(true)}
              >
                {t("checkin.keepMovingCta", "Let's Move Again!")}
              </Button>

              {/* ── " - or - " separator ── */}
              <div className="flex items-center gap-3 py-1">
                <div className="h-px bg-border flex-1" />
                <span className="text-xs text-muted-foreground font-medium">— or —</span>
                <div className="h-px bg-border flex-1" />
              </div>

              {/* ── Inline activity log ── */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                  {t("activityLog.inlineLabel", "Log an activity instead")}
                </p>
                <ActivityLogInput
                  patientId={user?.id || ""}
                  patientName={user?.user_metadata?.full_name || ""}
                  brainloverId={user?.id || ""}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CheckInFlow
        checkInData={ci}
        isOpen={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) ci.refetch();
        }}
        onComplete={() => {
          // Mystery box "Finish" button handles closing
        }}
        allowBonusSession
      />
    </>
  );
}
