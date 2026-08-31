import { useTranslation } from "react-i18next";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/avatar";

export interface MovementStatusSectionProps {
  /** Whether the person has checked in today */
  hasCheckedIn: boolean;
  /** Check-in details object from Supabase */
  checkInDetails?: any;
  /** Display name of the person (patient or self) */
  displayName: string;
  /** Avatar URL for the person (optional) */
  avatarUrl?: string;
  /** Show the "switching view" hint (multiple patients) */
  showSwitchingHint?: boolean;
  /** Action area — buttons rendered on the right side */
  actions?: React.ReactNode;
}

/**
 * Shared "Today's Movement Status" card used by BrainLover, BrainLover Pro,
 * and any role that monitors a FreeBrainer's check-in status.
 *
 * All strings use i18n. No hardcoded English.
 */
export function MovementStatusSection({
  hasCheckedIn,
  checkInDetails,
  displayName,
  avatarUrl,
  showSwitchingHint,
  actions,
}: MovementStatusSectionProps) {
  const { t } = useTranslation();

  return (
    <Card className={`border-2 transition-all shadow-md overflow-hidden ${
      hasCheckedIn ? "border-success/50 bg-success/5" : "border-warning/50 bg-warning/5"
    }`}>
      <CardHeader className="pb-2 border-b border-border/40 bg-card/40 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 border border-border/40">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="text-xs font-bold">{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <Badge variant={hasCheckedIn ? "default" : "secondary"} className={hasCheckedIn ? "bg-success hover:bg-success/90" : "bg-warning hover:bg-warning/90 text-white"}>
            {hasCheckedIn ? t("caregiverDashboard.checkedInToday", "Checked In Today") : t("caregiverDashboard.actionNeeded", "Action Needed")}
          </Badge>
          <CardDescription className="text-xs font-bold uppercase tracking-wide text-foreground">
            {displayName}
          </CardDescription>
        </div>
        {showSwitchingHint && (
          <span className="text-[11px] text-muted-foreground font-medium">
            {t("caregiverDashboard.switchingView", "Switching active view")}
          </span>
        )}
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl shrink-0 ${
              hasCheckedIn ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
            }`}>
              {hasCheckedIn ? <CheckCircle2 className="h-9 w-9" /> : <AlertCircle className="h-9 w-9" />}
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("caregiverDashboard.todayMovementStatus", "Today's Movement Status")}
              </div>
              <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
                hasCheckedIn ? "text-success" : "text-warning"
              }`}>
                {hasCheckedIn ? t("caregiverDashboard.hasCheckedIn", "HAS CHECKED IN") : t("caregiverDashboard.hasNotCheckedIn", "HAS NOT CHECKED IN")}
              </div>

              {hasCheckedIn && (
                <p className="text-xs text-muted-foreground pt-1">
                  {checkInDetails?.checkin_status === 'moved' ? (
                    <>{t("caregiverDashboard.statusLabel", "Status")}: <span className="font-bold text-emerald-400">{t("checkin.moved", "I Moved Today")}</span></>
                  ) : checkInDetails?.checkin_status === 'flare_up' ? (
                    <>{t("caregiverDashboard.statusLabel", "Status")}: <span className="font-bold text-warning">{t("checkin.flareUp", "Tested My Brain")}</span></>
                  ) : checkInDetails?.checkin_status === 'rest_day' ? (
                    <>{t("caregiverDashboard.statusLabel", "Status")}: <span className="font-bold text-blue-400">{t("checkin.restDay", "Rested My Brain")}</span></>
                  ) : checkInDetails?.movement_type ? (
                    <>{t("caregiverDashboard.movementLabel", "Movement")}: <span className="font-bold text-foreground">{checkInDetails.movement_type}</span></>
                  ) : (
                    t("caregiverDashboard.checkedInTodayExclaim", "Checked in today!")
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Dynamic Action Area */}
          <div className="w-full sm:w-auto flex flex-col gap-2">
            {actions}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
